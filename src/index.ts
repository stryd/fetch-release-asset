import * as core from '@actions/core';
import { fetchAssetFromRelease } from './github-service';
import fs from 'fs';
import path from 'path';

const run = async (): Promise<void> => {
  try {
    const token = core.getInput('access_token');
    const repo = core.getInput('repo');
    const version = core.getInput('version');
    const assetName = core.getInput('asset_name');
    let filePath = core.getInput('save_as');

    // set default save location
    if (!filePath) {
      filePath = path.join(__dirname, assetName);
    } else {
      filePath = path.join(__dirname, filePath);
    }

    const file = await fetchAssetFromRelease({
      token,
      repo,
      version,
      assetName
    });

    // save to filesystem
    fs.writeFileSync(filePath, Buffer.from(file));
    core.info(`saved ${assetName} to file system as ${filePath}`);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
