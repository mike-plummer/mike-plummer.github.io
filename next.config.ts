import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  transpilePackages: ['@mlc-ai/web-llm'],
  trailingSlash: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true
  },
  sassOptions: {
    silenceDeprecations: ['import']
  }
};

export default nextConfig;
