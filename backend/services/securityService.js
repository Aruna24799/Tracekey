async function securityService(error) {
  const threats = [];

  // API Key patterns
  if (/AIza[0-9A-Za-z\-_]{35}/.test(error)) threats.push({ type: "CRITICAL", message: "Google API Key Exposed" });
  if (/sk-[a-zA-Z0-9]{32,}/.test(error)) threats.push({ type: "CRITICAL", message: "OpenAI API Key Exposed" });
  if (/AKIA[0-9A-Z]{16}/.test(error)) threats.push({ type: "CRITICAL", message: "AWS Access Key Exposed" });

  // Token patterns
  if (error.includes("Bearer") && error.includes("eyJ")) threats.push({ type: "HIGH", message: "JWT Token Exposed in Error" });

  // URL patterns
  if (error.includes("http://")) threats.push({ type: "MEDIUM", message: "Insecure HTTP URL Detected (use HTTPS)" });

  // Credential patterns
  if (/password\s*[:=]\s*["']?[^"'\s]+/.test(error.toLowerCase())) {
    threats.push({ type: "CRITICAL", message: "Hardcoded Password Detected" });
  }
  if (/secret\s*[:=]\s*["']?[^"'\s]+/.test(error.toLowerCase())) {
    threats.push({ type: "HIGH", message: "Secret Key in Error Context" });
  }

  return {
    hasThreats: threats.length > 0,
    count: threats.length,
    threats
  };
}

module.exports = securityService;
