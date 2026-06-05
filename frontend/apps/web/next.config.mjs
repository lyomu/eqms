/** @type {import('next').NextConfig} */

// Backend origin for the dev/proxy rewrite. Browser talks only to the Next origin,
// so the JSESSIONID session cookie stays first-party (SameSite=Strict works) and we
// avoid CORS entirely. Override per environment via BACKEND_ORIGIN.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Proxy all API + actuator calls to the Spring Boot backend.
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
