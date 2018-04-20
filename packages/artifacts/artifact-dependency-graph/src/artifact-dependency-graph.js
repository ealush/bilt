'use strict'

const createDependencyGraph = artifacts =>
  objectFromEntries(artifacts.map(({name, dependencies}) => [name, dependencies || []]))

function dependencyGraphSubsetToBuild(
  dependencyGraph,
  changedArtifacts,
  fromArtifacts,
  uptoArtifacts,
  justBuildArtifacts,
) {
  const dependencyGraphSubset = {}

  // from
  if (fromArtifacts) {
    const changedArtifactsFrom = changedArtifacts
      ? intersection(fromArtifacts || changedArtifacts, changedArtifacts)
      : fromArtifacts || changedArtifacts

    const fromClosure = new Set(changedArtifactsFrom)

    addArtifactsAffectedByBuildingArtifactsInClosure(fromClosure, dependencyGraph)

    fromClosure.forEach(build => (dependencyGraphSubset[build] = dependencyGraph[build]))
  }

  // upto
  if (uptoArtifacts) {
    const changedArtifactsUpto = changedArtifacts
      ? intersection(uptoArtifacts || changedArtifacts, changedArtifacts)
      : uptoArtifacts || changedArtifacts

    const uptoClosure = new Set(changedArtifactsUpto)

    addArtifactsNeededToBeBuiltForArtifactsInClosure(uptoClosure, dependencyGraph)

    uptoClosure.forEach(build => (dependencyGraphSubset[build] = dependencyGraph[build]))
  }

  // justBuild
  if (justBuildArtifacts) {
    const justBuildChangedArtifacts = changedArtifacts
      ? intersection(justBuildArtifacts, changedArtifacts)
      : justBuildArtifacts

    justBuildChangedArtifacts.forEach(
      build => (dependencyGraphSubset[build] = dependencyGraph[build]),
    )
  }

  // filter dependencies
  filterOutArtifactsFromDependencies(dependencyGraphSubset)

  if (changedArtifacts) {
    removeLeafArtifactsThatDoNotNeedToBeBuilt(dependencyGraphSubset, changedArtifacts)
  }

  // filter dependencies again (because leaf nodes were removed from dependency graph)
  filterOutArtifactsFromDependencies(dependencyGraphSubset)

  return dependencyGraphSubset
}

function filterOutArtifactsFromDependencies(ret) {
  const artifactsToBuild = Object.keys(ret)

  Object.entries(ret).forEach(
    ([artifact, dependencies]) =>
      (ret[artifact] = intersection(dependencies || [], artifactsToBuild)),
  )
}

function removeLeafArtifactsThatDoNotNeedToBeBuilt(dependencyGraph, changedArtifacts) {
  return objectFromEntries(
    Object.entries(dependencyGraph).filter(
      ([artifact, dependencies]) => dependencies.length > 0 || changedArtifacts.includes(artifact),
    ),
  )
}

const buildsThatCanBeBuilt = (dependencyGraph, alreadyBuiltArtifacts) => {
  const alreadyBuiltArtifactsSet = new Set(alreadyBuiltArtifacts)

  return difference(
    Object.entries(dependencyGraph)
      .filter(([, dependencies]) =>
        dependencies.every(dependentBuild => alreadyBuiltArtifactsSet.has(dependentBuild)),
      )
      .map(([build]) => build),
    alreadyBuiltArtifacts,
  )
}

const difference = (arr, brr) => arr.filter(aMember => !brr.includes(aMember))
const intersection = (arr, bset) => arr.filter(aMember => bset.includes(aMember))

function addArtifactsAffectedByBuildingArtifactsInClosure(closure, dependencyGraph) {
  let addToBuildsInClosure = true

  while (addToBuildsInClosure) {
    const lengthOfClosure = closure.size

    artifactsAffectedByBuildingArtifactsInClosure(closure, dependencyGraph).forEach(build =>
      closure.add(build),
    )

    addToBuildsInClosure = lengthOfClosure < closure.size
  }
}

function artifactsAffectedByBuildingArtifactsInClosure(closure, dependencyGraph) {
  return Object.entries(dependencyGraph)
    .filter(([, dependencies]) => !!dependencies.find(dependent => closure.has(dependent)))
    .map(([build]) => build)
}

function addArtifactsNeededToBeBuiltForArtifactsInClosure(closure, dependencyGraph) {
  let addToBuildsInClosure = true

  while (addToBuildsInClosure) {
    const lengthOfClosure = closure.size

    artifactsNeededToBeDirectlyBuiltForArtifactsInClosure(closure, dependencyGraph).forEach(build =>
      closure.add(build),
    )

    addToBuildsInClosure = lengthOfClosure < closure.size
  }
}

const flatten = arr => [].concat(...arr)

function artifactsNeededToBeDirectlyBuiltForArtifactsInClosure(closure, dependencyGraph) {
  return flatten([...closure].map(artifact => dependencyGraph[artifact]))
}

function objectFromEntries(entries) {
  const ret = Object.create(null)

  for (const [key, value] of entries) {
    ret[key] = value
  }

  return ret
}

module.exports = {
  createDependencyGraph,
  dependencyGraphSubsetToBuild,
  buildsThatCanBeBuilt,
}
