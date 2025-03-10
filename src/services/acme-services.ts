import { CustomRequest } from "@/types/types";
import { BadRequestError } from "@/utils/errors";
import acme from "acme-client";
import { Challenge } from "acme-client/types/rfc8555";

const setupChallenges = async (
  req: CustomRequest,
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
      challenges.push(challengeDetails);
    }

    (req.session as any).sslData = {
      order: order,
      challenges: challenges,
    } as any;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject("An error occurred while saving session data");
        resolve();
      });
    });

    return logChallengeInstruction(challenges);
  } catch (error) {
    throw new Error(
      "An error occured while setting up challenge. Please try again"
    );
  }
};

const fetchDomainChallenge = async (
  client: acme.Client,
  mainDomain: string,
  domain: string,
  auth: acme.Authorization,
  challenge: Challenge
) => {
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
        ? "_acme-challenge"
        : `_acme-challenge.${firstPartOfDomain}`;

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
};

const logChallengeInstruction = (challenges: Array<any>) => {
  let instruction = "";
  let challengeInstructions = [];
  for (const challenge of challenges) {
    if (challenge.challengeType === "http-01") {
      instruction = `Please create a file at: ${challenge.filePath}
      With the following content: ${challenge.fileContent}`;
      challengeInstructions.push(instruction);
    } else if (challenge.challengeType === "dns-01") {
      instruction = `Plese add the following TXT record to your DNS configuration: 
      Host: ${challenge.dnsHost}
    TEXT value: ${challenge.dnsValue}`;
      challengeInstructions.push(instruction);
    } else {
      challengeInstructions.push("Invalid challenge type");
      break;
    }
  }

  return challengeInstructions;
};

const verifyChallenges = async (
  client: acme.Client,
  challenges: Array<any>
) => {
  for (let challenge of challenges) {
    try {
      await client.verifyChallenge(challenge.auth, challenge.challenge);
      await client.completeChallenge(challenge.challenge);
      await client.waitForValidStatus(challenge.auth);
    } catch (error) {
      console.log("Error: ", error);
      throw new Error(
        "Error occurred while verifying domain ownership, , restart the process or try again."
      );
    }
  }
};

const generateCertificate = async (
  client: acme.Client,
  order: acme.Order,
  csrCertificate: any
) => {
  try {
    const finalized = await client.finalizeOrder(order, csrCertificate);
    return await client.getCertificate(finalized);
  } catch (error) {
    throw new Error(
      "Error occurred generating ssl certificate, restart the process or try again."
    );
  }
};

const getSSLData = async (
  csrCertificate: any,
  csrCertificateKey: any,
  sslCertificate: any
) => {
  return {
    csrCertificate: Buffer.from(csrCertificate.data)
      .toString("utf-8")
      .replace(/\n/g, ""),
    csrCertificateKey: Buffer.from(csrCertificateKey.data)
      .toString("utf-8")
      .replace(/\n/g, ""),
    sslCertificate: sslCertificate.replace(/\n/g, ""),
  };
};

const revokeSSL = async (
  client: acme.Client,
  sslCertificate: string | Buffer,
  reason: number = 0
) => {
  try {
    return await client.revokeCertificate(sslCertificate, { reason: reason });
  } catch (error: any) {
    if (error.message.includes("status other than revoked")) {
      throw new BadRequestError("Certificate is already revoked.");
    }
    throw new Error(
      "Error occurred revoking ssl certificate. Please confirm the certificate and try again."
    );
  }
};

export {
  setupChallenges,
  verifyChallenges,
  generateCertificate,
  getSSLData,
  revokeSSL,
};
