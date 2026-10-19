import { ComponentNode } from '../../../types/builder';
import { automotiveHomeComponents } from './homeComponents';
import { automotiveFleetComponents } from './fleetComponents';
import { automotiveContactComponents } from './contactComponents';
import { automotiveAboutComponents } from './aboutComponents';
import { automotiveTeamComponents } from './teamComponents';
import { automotiveBranchesComponents } from './branchesComponents';
import { automotiveCertificationsComponents } from './certificationsComponents';

export const initialAutomotiveComponents: Record<string, ComponentNode> = {
  ...automotiveHomeComponents,
  ...automotiveFleetComponents,
  ...automotiveContactComponents,
  ...automotiveAboutComponents,
  ...automotiveTeamComponents,
  ...automotiveBranchesComponents,
  ...automotiveCertificationsComponents,
};
