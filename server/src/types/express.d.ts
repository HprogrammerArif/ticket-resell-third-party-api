declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
    // Deliberately separate from `user`. Keeping the two on different
    // properties means no handler can mistake one identity for the other.
    admin?: {
      id: string;
      email: string;
      name: string;
    };
  }
}
