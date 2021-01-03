'use strict'
const {describe, it, afterEach} = require('mocha')
const expect = require('unexpected')
const {sh, shWithOutput, makeTemporaryDirectory, writeFile} = require('@bilt/scripting-commons')

const {startNpmRegistry, enablePackageToPublishToRegistry} = require('../../src/npm-testkit')

describe('startNpmRegistry', function () {
  /**@type {string}*/
  let registry
  /**@type {() => Promise<void>}*/
  let close
  afterEach(() => close())

  it('should enable running an npm registry and publishing to it', async () => {
    ;({registry, close} = await startNpmRegistry())
    const cwd = await makeTemporaryDirectory()
    await writeFile('package.json', {name: 'foo-package', version: '6.6.6'}, {cwd})
    await writeFile('.npmrc', `registry=${registry}`, {cwd})

    await enablePackageToPublishToRegistry(cwd, registry)

    await sh('npm publish', {cwd})

    expect(
      await shWithOutput(`npm view foo-package version --registry=${registry}`, {cwd}),
      'to equal',
      '6.6.6\n',
    )
  })

  it('should support npm audit', async () => {
    ;({registry, close} = await startNpmRegistry())
    const cwd = await makeTemporaryDirectory()
    await writeFile('package.json', {name: 'foo-package', version: '6.6.6'}, {cwd})
    await writeFile('.npmrc', `registry=${registry}`, {cwd})
    await sh('npm install', {cwd})

    await sh('npm audit', {cwd})
  })

  it('should support external npmjs packages', async () => {
    ;({registry, close} = await startNpmRegistry({shouldProxyToNpmJs: true}))
    const cwd = await makeTemporaryDirectory()
    await writeFile('package.json', {name: 'lodash', version: '4.17.20'}, {cwd})
    await writeFile('.npmrc', `registry=${registry}`, {cwd})
    await sh('npm install', {cwd})

    expect(await shWithOutput('npm view lodash version', {cwd}), 'to equal', '4.17.20\n')
  })
})
