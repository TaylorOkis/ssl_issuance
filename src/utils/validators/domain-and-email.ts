const validateDomainAndEmail = ({
  domain,
  subDomain,
  email,
}: {
  domain: string;
  subDomain: Array<string>;
  email: string;
}) => {
  let validEmailAddress = false;
  let validDomain = false;
  let validSubDomain = false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i;

  if (emailPattern.test(email)) validEmailAddress = true;
  if (domainPattern.test(domain)) validDomain = true;

  for (let subdomain of subDomain) {
    if (domainPattern.test(subdomain)) {
      let subDomainParts = subdomain.split(".");
      if (!(`${subDomainParts.slice(1).join(".")}` === domain)) {
        validSubDomain = false;
        break;
      }
      validSubDomain = true;
    } else {
      validSubDomain = false;
      break;
    }
  }

  return validEmailAddress && validDomain && validSubDomain;
};

export default validateDomainAndEmail;
