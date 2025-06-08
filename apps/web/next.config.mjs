import { StatsWriterPlugin } from "webpack-stats-plugin";
import filterWebpackStats from "@bundle-stats/plugin-webpack-filter";

/**
 * Configure webpack to generate stats for RelativeCI
 * @param {import('webpack').Configuration} config - Webpack configuration
 * @param {boolean} isServer - Whether this is a server-side build
 * @returns {import('webpack').Configuration} Modified webpack configuration
 */
function configureRelativeCI(config, isServer) {
	if (isServer || process.env.RELATIVE_CI !== "true") {
		return config;
	}

	const statsPlugin = new StatsWriterPlugin({
		// Output stats file to the project root (apps/web/) instead of .next/
		filename: "../webpack-stats.json",
		stats: {
			assets: true,
			chunks: true,
			modules: true,
		},
		transform: (webpackStats) => {
			// Filter out the stats that are not needed for RelativeCI
			// https://relative-ci.com/documentation/guides/bundle-stats/nextjs-webpack-stats/#optimize-the-json-file-size
			const filteredSource = filterWebpackStats(webpackStats);
			return JSON.stringify(filteredSource);
		},
	});

	return {
		...config,
		plugins: [...config.plugins, statsPlugin],
	};
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@workspace/ui"],
	webpack: (config, { isServer }) => {
		return configureRelativeCI(config, isServer);
	},
};

let exportConfig = nextConfig;

if (process.env.ANALYZE === "true") {
	const { default: withBundleAnalyzer } = await import("@next/bundle-analyzer");
	exportConfig = withBundleAnalyzer({
		enabled: true,
	})(nextConfig);
}

export default exportConfig;
