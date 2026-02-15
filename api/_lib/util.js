export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function isGmail(email) {
  return /@gmail\.com$/i.test(String(email || "").trim());
}

export function now() {
  return Date.now();
}

export function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}
