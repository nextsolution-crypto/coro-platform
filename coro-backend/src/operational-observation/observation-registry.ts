export const OBSERVATION_REGISTRY = Object.freeze([
  {
    code: 'ACTIVE_INCIDENTS',
    owner: 'INCIDENT',
    quality: 'CANONICAL',
    sourceModels: ['IncidentEvent'],
  },
  {
    code: 'ACTIVE_EVACUATIONS',
    owner: 'SENTINELLE',
    quality: 'CANONICAL',
    sourceModels: ['EvacuationEvent'],
  },
  {
    code: 'POPULATION_PROGRAM_ACTIVE',
    owner: 'POPULATION',
    quality: 'CANONICAL',
    sourceModels: ['PopulationProgram'],
  },
  {
    code: 'POPULATION_OPERATION_ACTIVE',
    owner: 'POPULATION',
    quality: 'CANONICAL',
    sourceModels: ['PopulationOperationalEvent'],
  },
  {
    code: 'POPULATION_ALERT_ACTIVE',
    owner: 'POPULATION',
    quality: 'CANONICAL',
    sourceModels: ['PopulationAlert'],
  },
  {
    code: 'SENTINELLE_ACTIVE_OPERATION',
    owner: 'SENTINELLE',
    quality: 'DERIVED',
    sourceModels: ['IncidentEvent', 'EvacuationEvent'],
  },
]);
