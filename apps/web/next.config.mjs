/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@workspace/ui"],
};

let exportConfig = nextConfig;

if (process.env.ANALYZE === "true") {
	const { default: withBundleAnalyzer } = await import("@next/bundle-analyzer");
	exportConfig = withBundleAnalyzer({
		enabled: true,
	})(nextConfig);
}

export default exportConfig;
