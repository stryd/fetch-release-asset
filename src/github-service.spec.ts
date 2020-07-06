import { fetchAsset, IRelease, fetchAssetFromRelease } from './github-service';
import axios, { AxiosResponse } from 'axios';
import { mockInputs } from './__mocks__/mock-inputs';

jest.mock('axios');

afterEach(() => jest.clearAllMocks());

afterAll(() => jest.restoreAllMocks());

const mockGet = axios.get as jest.Mock;

const fakeRelease: IRelease = {
  url: 'https://release-url.github.com',
  assets: [
    { url: 'https://some-asset.github.com', id: 1, name: mockInputs.asset_name }
  ]
};

const releaseRes: AxiosResponse = {
  data: fakeRelease,
  status: 200,
  statusText: 'FOUND',
  config: {},
  headers: {}
};

const fileRedirectRes: AxiosResponse = {
  data: {},
  status: 302,
  statusText: 'FOUND',
  config: {},
  headers: {
    location: 'https://githubs3.file.location.com'
  }
};

const fakeFile = new ArrayBuffer(16); // size isn't important here
const fileRes: AxiosResponse = {
  data: fakeFile,
  status: 200,
  statusText: 'OK',
  config: {},
  headers: {}
};

test('correctly handles the github asset redirect for files', async () => {
  mockGet.mockResolvedValueOnce(fileRedirectRes).mockResolvedValueOnce(fileRes);

  const assetURL = 'https://github.com/fake/repo/asset/1234';

  const asset = await fetchAsset({
    token: mockInputs.access_token,
    url: assetURL
  });

  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(asset).toBe(fakeFile);

  // validate first call for the asset location
  const [infoUrl, infoReqConfig] = mockGet.mock.calls[0];

  expect(infoUrl).toBe(assetURL);

  // tslint:disable
  expect(infoReqConfig.headers['Authorization']).toBe(
    `token ${mockInputs.access_token}`
  );
  expect(infoReqConfig.headers['Accept']).toBe('application/octet-stream');
  // tslint:enable

  // validate second call is for the asset file
  const [fileUrl, fileReqConfig] = mockGet.mock.calls[1];

  expect(fileUrl).toBe(fileRedirectRes.headers.location);

  // GitHub errors out if the auth token is included again in the file request
  // tslint:disable
  expect(fileReqConfig.headers['Authorization']).toBe(undefined);
  expect(fileReqConfig.headers['Accept']).toBe('application/octet-stream');
  // tslint:enable
});

test('can fetch an asset based on name and release/version', async () => {
  mockGet
    .mockResolvedValueOnce(releaseRes)
    .mockResolvedValueOnce(fileRedirectRes)
    .mockResolvedValueOnce(fileRes);

  const assetFile = await fetchAssetFromRelease({
    token: mockInputs.access_token,
    repo: mockInputs.repo,
    version: mockInputs.version,
    assetName: mockInputs.asset_name
  });

  expect(assetFile).toBe(fakeFile);
  expect(mockGet).toHaveBeenCalledTimes(3);

  const [releaseUrl, releaseReqConfig] = mockGet.mock.calls[0];
  const [assetInfoUrl] = mockGet.mock.calls[1];
  const [fileUrl] = mockGet.mock.calls[2];

  expect(releaseUrl).toBe(
    `https://api.github.com/repos/${mockInputs.repo}/releases/tags/${mockInputs.version}`
  );
  expect(assetInfoUrl).toBe(fakeRelease.assets![0].url);
  expect(fileUrl).toBe(fileRedirectRes.headers.location);

  // tslint:disable-next-line
  expect(releaseReqConfig.headers['Authorization']).toBe(
    `token ${mockInputs.access_token}`
  );
});
