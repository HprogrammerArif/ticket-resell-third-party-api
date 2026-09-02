/**
 * The shape every image source returns.
 *
 * Lives apart from service.ts because service.ts imports the resolvers and the
 * resolvers need this type, which would otherwise be a cycle.
 */
export type PerformerImage = {
  url: string;
  width: number;
  height: number;
  sourcePage: string;
  title: string;
};
