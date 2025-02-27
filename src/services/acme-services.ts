import acme from "acme-client";
import { Challenge } from "acme-client/types/rfc8555";

const setupChallenges = async (
  client: acme.Client,
  domains: Array<string>,
  challengeType: string
) => {
  let challenges = [];
  try {
    let mainDomain = domains[0];
    const identifiers = domains.map((domain) => ({
      type: "dns",
      value: domain,
    }));

    const order = await client.createOrder({ identifiers });
    const authorizations = await client.getAuthorizations(order);

    for (let auth of authorizations) {
      console.log("Setting up challenge for ", auth.identifier.value);
      const selectedChallenge = auth.challenges.find(
        (ch) => ch.type === challengeType
      );
      const challengeDetails = await fetchDomainChallenge(
        client,
        mainDomain,
        auth.identifier.value,
        auth,
        selectedChallenge as Challenge
      );
      console.log("\nChallenge details: ", challengeDetails);
      challenges.push(challengeDetails);
    }

    // TODO: Save order in session.

    return challenges;
  } catch (error) {
    console.log("Challenge Error: ", error);
    throw new Error(
      "An error occured while setting up challenge. Please try again"
    );
  }
};

async function fetchDomainChallenge(
  client: acme.Client,
  mainDomain: string,
  domain: string,
  auth: acme.Authorization,
  challenge: Challenge
) {
  const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

  if (challenge.type === "http-01") {
    return {
      domain: domain,
      challengeType: "http-01",
      challenge: challenge,
      auth: auth,
      filePath: `http://${domain}/.well-known/acme-challenge/${challenge.token}`,
      fileContent: keyAuthorization,
    };
  } else if (challenge.type === "dns-01") {
    const firstPartOfDomain = domain.split(".")[0];
    const dnsHost =
      firstPartOfDomain === mainDomain.split(".")[0]
        ? "_acme_challenge"
        : `_acme_challenge.${firstPartOfDomain}`;

    return {
      domain: domain,
      challengeType: "dns-01",
      challenge: challenge,
      auth: auth,
      dnsHost: dnsHost,
      dnsValue: keyAuthorization,
    };
  } else {
    return "Invalid Challenge type";
  }
}

export { setupChallenges };
