# fetch-release-asset
A GitHub action to fetch a release asset and store to the file system

## Usage
See [action.yml](https://github.com/stryd/fetch-release-asset/blob/master/action.yml) for inputs and descriptions

Basic: 
```yml
steps: 
  uses: stryd/fetch-release-asset@v1
  with:  
    access_token: 'your-access-token'
    repo: 'owner/repo'
    version: 'latest'
    asset_name: 'archive.tar.gz'
```