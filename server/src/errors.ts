/** A requested resource does not exist. The HTTP layer maps this to 404. */
export class NotFoundError extends Error {
  override name = 'NotFoundError';

  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' was not found`);
  }
}
