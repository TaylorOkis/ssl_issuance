import acme from "acme-client";

const DIRECTORY_URL = acme.directory.letsencrypt.staging;

const VALID_REVOCATION_REASONS = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 10]);

export { DIRECTORY_URL, VALID_REVOCATION_REASONS };
