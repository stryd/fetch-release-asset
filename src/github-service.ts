import axios from 'axios';
import * as core from '@actions/core';

export interface IReleaseRequestParams {
  token: string;
  repo: string;
  version: string;
  assetName: string;
}

export interface IAssetRequestParams {
  token: string;
  url: string;
}

// lots of stuff on these release/assets objects, just declaring the minimum we need for now
export interface IAsset {
  url: string;
  id: number;
  name: string;
}

export interface IRelease {
  url: string;
  assets: IAsset[] | null;
}

/**
 * Fetches release data for a given repo/version combination
 * @param params
 */
export const fetchRelease = async (params: IReleaseRequestParams) => {
  const { repo, version, token } = params;
  const url = `https://api.github.com/repos/${repo}/releases/tags/${version}`;
  const headers = {
    Authorization: `token ${token}`
  };

  const res = await axios.get<IRelease>(url, { headers });
  return res.data;
};

/**
 * GitHub responds to a file asset request with the 'application/octet-stream' header by sending
 * a redirect to their S3 location. GitHub's S3 does not allow the auth token to be sent again, but the
 * default behavior of most node HTTP libraries is to automatically forward the Authorization header to the redirect.
 * To work around this, we grab the redirect location, and follow it with a separate request with no auth included.
 */
export const fetchAsset = async (params: IAssetRequestParams) => {
  const { url, token } = params;

  const fileRedirectRes = await axios.get(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/octet-stream'
    },
    maxRedirects: 0,
    validateStatus: status => status === 302
  });

  // retrieve the S3 location of the asset from the redirect headers
  const { location } = fileRedirectRes.headers;

  core.debug(`Got asset redirect to ${location}`);

  const fileRes = await axios.get<ArrayBuffer>(location, {
    headers: { Accept: 'application/octet-stream' },
    responseType: 'arraybuffer'
  });

  core.debug(`asset request status: ${fileRes.status}`);

  return fileRes.data;
};

/**
 * Fetches a release asset by name for a given repo / version
 */
export const fetchAssetFromRelease = async (params: IReleaseRequestParams) => {
  const { token, repo, version, assetName } = params;

  const release = await fetchRelease(params);

  if (!release) {
    throw new Error(`Could not find release: ${repo} @ ${version}`);
  } else if (!release.assets) {
    throw new Error(`Could not find assets for release: ${repo} @ ${version}`);
  }

  const asset = release.assets.find(
    releaseAsset => releaseAsset.name === assetName
  );

  if (!asset) {
    throw new Error(`Could not find ${assetName} in ${repo}@${version}`);
  }

  core.debug(`Fetching asset at ${asset.url}`);

  return await fetchAsset({ token, url: asset.url });
};
