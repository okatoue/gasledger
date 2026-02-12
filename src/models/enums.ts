export enum FuelType {
  Gasoline = 'gasoline',
  Diesel = 'diesel',
  Other = 'other',
}

export enum FuelGrade {
  Regular = 'regular',
  Midgrade = 'midgrade',
  Premium = 'premium',
  Diesel = 'diesel',
  Other = 'other',
}

export enum PriceSource {
  Manual = 'manual',
  Edited = 'edited',
  Suggested = 'suggested',
}

export enum EfficiencySource {
  Dataset = 'dataset',
  Manual = 'manual',
}

export enum EfficiencyUnit {
  Mpg = 'mpg',
  LPer100Km = 'l_per_100km',
  KmPerL = 'km_per_l',
}

export enum SessionStatus {
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
}

export enum AuthProvider {
  Apple = 'apple',
  Google = 'google',
  Email = 'email',
}
