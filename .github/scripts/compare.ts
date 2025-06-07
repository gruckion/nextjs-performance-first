#!/usr/bin/env node
/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import filesize from "filesize";
import { toWords } from "number-to-words";
import {
	getOptions,
	getBuildOutputDirectory,
	type BundleAnalysisOptions,
} from "./utils.js";

// Types for bundle data
interface BundleStats {
	raw: number;
	gzip: number;
}

interface BundleData {
	[page: string]: BundleStats;
}

interface PageChange extends BundleStats {
	page: string;
	rawDiff?: number;
	gzipDiff?: number;
	increase?: boolean;
}

interface FilesizeOptions {
	spacer?: string;
	[key: string]: unknown;
}

// Override default filesize options to display a non-breakable space as a spacer.
const formatFilesize = (bytes: number, options?: FilesizeOptions): string => {
	return filesize(bytes, {
		spacer: " ",
		...options,
	});
};

/**
 * Analyzes changes in the global bundle
 */
const analyzeGlobalBundle = (
	current: BundleStats | undefined,
	base: BundleStats | undefined,
	minimumChangeThreshold?: number,
): PageChange | null => {
	if (!current || !base) return null;

	const gzipDiff = current.gzip - base.gzip;

	if (gzipDiff === 0) return null;
	if (
		minimumChangeThreshold !== undefined &&
		Math.abs(gzipDiff) <= minimumChangeThreshold
	)
		return null;

	return {
		page: "global",
		...current,
		gzipDiff,
		increase: gzipDiff > 0,
	};
};

/**
 * Creates a page change object if it meets the threshold
 */
const createPageChange = (
	page: string,
	currentStats: BundleStats,
	baseStats: BundleStats,
	minimumChangeThreshold?: number,
): PageChange | null => {
	const rawDiff = currentStats.raw - baseStats.raw;
	const gzipDiff = currentStats.gzip - baseStats.gzip;

	if (
		minimumChangeThreshold !== undefined &&
		Math.abs(gzipDiff) <= minimumChangeThreshold
	) {
		return null;
	}

	return {
		page,
		...currentStats,
		rawDiff,
		gzipDiff,
		increase: gzipDiff > 0,
	};
};

/**
 * Analyzes all pages for changes
 */
const analyzePages = (
	currentBundle: BundleData,
	baseBundle: BundleData,
	minimumChangeThreshold?: number,
): { newPages: PageChange[]; changedPages: PageChange[] } => {
	const pages = Object.entries(currentBundle)
		.filter(([page]) => page !== "__global")
		.reduce<{ newPages: PageChange[]; changedPages: PageChange[] }>(
			(acc, [page, currentStats]) => {
				const baseStats = baseBundle[page];

				if (!baseStats) {
					return {
						...acc,
						newPages: [...acc.newPages, { page, ...currentStats }],
					};
				}

				if (currentStats.gzip !== baseStats.gzip) {
					const change = createPageChange(
						page,
						currentStats,
						baseStats,
						minimumChangeThreshold,
					);
					if (change) {
						return {
							...acc,
							changedPages: [...acc.changedPages, change],
						};
					}
				}

				return acc;
			},
			{ newPages: [], changedPages: [] },
		);

	return pages;
};

/**
 * Renders a colored status indicator based on percentage change
 */
const renderStatusIndicator = (
	percentageChange: number,
	budgetPercentIncreaseRed: number,
): string => {
	if (percentageChange >= budgetPercentIncreaseRed) return "🔴 +";
	if (percentageChange > 0 && percentageChange < budgetPercentIncreaseRed)
		return "🟡 +";
	if (percentageChange < 0.01 && percentageChange > -0.01) return "";
	return "🟢 ";
};

/**
 * Renders the bundle size with optional diff
 */
const renderSize = (
	d: PageChange,
	showBudgetDiff: boolean,
	budgetPercentIncreaseRed: number,
): string => {
	const gzd = d.gzipDiff ?? 0;
	const percentChange = (gzd / d.gzip) * 100;
	const sizeStr = ` | \`${formatFilesize(d.gzip)}\``;

	if (gzd && !showBudgetDiff) {
		const indicator = renderStatusIndicator(
			percentChange,
			budgetPercentIncreaseRed,
		);
		return `${sizeStr} _(${indicator}${formatFilesize(gzd)})_`;
	}
	return sizeStr;
};

/**
 * Renders the first load size
 */
const renderFirstLoad = (
	globalBundleCurrent: BundleStats | null,
	firstLoadSize: number,
): string => {
	if (!globalBundleCurrent) return "";
	return ` | ${formatFilesize(firstLoadSize)}`;
};

/**
 * Renders the budget percentage
 */
const renderBudgetPercentage = (
	showBudget: boolean,
	budgetPercentage: number,
	previousBudgetPercentage: number,
	budgetChange: number,
	budgetPercentIncreaseRed: number,
): string => {
	if (!showBudget) return "";

	const indicator = renderStatusIndicator(
		budgetChange,
		budgetPercentIncreaseRed,
	);
	const changeText =
		budgetChange < 0.01 && budgetChange > -0.01
			? "+/- <0.01%"
			: `${budgetChange}%`;
	const budgetChangeText = ` _(${indicator}${changeText})_`;

	const budgetStr = ` | ${budgetPercentage}%`;
	return previousBudgetPercentage
		? `${budgetStr}${budgetChangeText}`
		: budgetStr;
};

/**
 * Generates a markdown table for the data
 */
const markdownTable = (
	data: PageChange | PageChange[],
	globalBundleCurrent: BundleStats | null,
	globalBundleBase: BundleStats | null,
	options: BundleAnalysisOptions,
): string => {
	const items = Array.isArray(data) ? data : [data];
	const showBudget = !!(globalBundleCurrent && options.budget);
	const showBudgetDiff = !!(options.budget && globalBundleBase);
	const budgetPercentIncreaseRed = options.budgetPercentIncreaseRed ?? 20;

	// Table headers
	const headerParts: string[] = ["Page", "Size (compressed)"];
	if (globalBundleCurrent) {
		headerParts.push("First Load");
	}
	if (showBudget && options.budget) {
		headerParts.push(`% of Budget (\`${formatFilesize(options.budget)}\`)`);
	}
	const headers = headerParts.join(" | ");

	const separator = headers
		.split(" | ")
		.map(() => "---")
		.join("|");

	// Table rows
	const rows = items.map((d) => {
		const firstLoadSize = globalBundleCurrent
			? d.gzip + globalBundleCurrent.gzip
			: 0;

		const budgetPercentage =
			showBudget && options.budget
				? Number(((firstLoadSize / options.budget) * 100).toFixed(2))
				: 0;

		let previousBudgetPercentage = 0;
		if (
			globalBundleBase &&
			globalBundleCurrent &&
			d.gzipDiff &&
			options.budget
		) {
			const previousFirstLoad = globalBundleCurrent.gzip + d.gzip - d.gzipDiff;
			previousBudgetPercentage = Number(
				((previousFirstLoad / options.budget) * 100).toFixed(2),
			);
		}

		const budgetChange = previousBudgetPercentage
			? Number((budgetPercentage - previousBudgetPercentage).toFixed(2))
			: 0;

		const parts = [
			`| \`${d.page}\``,
			renderSize(d, showBudgetDiff, budgetPercentIncreaseRed),
			renderFirstLoad(globalBundleCurrent, firstLoadSize),
			renderBudgetPercentage(
				showBudget,
				budgetPercentage,
				previousBudgetPercentage,
				budgetChange,
				budgetPercentIncreaseRed,
			),
			" |",
		];
		return parts.join("");
	});

	return `${headers}\n|${separator}|\n${rows.join("\n")}`;
};

/**
 * Generates the global bundle section
 */
const generateGlobalSection = (
	globalChanges: PageChange,
	options: BundleAnalysisOptions,
): string => {
	const icon = globalChanges.increase ? "⚠️" : "🎉";
	const direction = globalChanges.increase ? "Increased" : "Decreased";

	let section = `### ${icon}  Global Bundle Size ${direction}\n\n`;
	section += markdownTable(globalChanges, null, null, options);

	if (options.showDetails !== false) {
		section += `\n<details>
<summary>Details</summary>
<p>The <strong>global bundle</strong> is the javascript bundle that loads alongside every page. It is in its own category because its impact is much higher - an increase to its size means that every page on your website loads slower, and a decrease means every page loads faster.</p>
<p>Any third party scripts you have added directly to your app using the <code>&lt;script&gt;</code> tag are not accounted for in this analysis</p>
<p>If you want further insight into what is behind the changes, give <a href='https://www.npmjs.com/package/@next/bundle-analyzer'>@next/bundle-analyzer</a> a try!</p>
</details>\n\n`;
	}

	return section;
};

/**
 * Generates the new pages section
 */
const generateNewPagesSection = (
	newPages: PageChange[],
	globalBundleCurrent: BundleStats,
	options: BundleAnalysisOptions,
): string => {
	const plural = newPages.length > 1 ? "s" : "";
	const verb = plural === "s" ? "were" : "was";

	let section = `### New Page${plural} Added\n\n`;
	section += `The following page${plural} ${verb} added to the bundle from the code in this PR:\n\n`;
	section += `${markdownTable(newPages, globalBundleCurrent, null, options)}\n`;

	return section;
};

/**
 * Title case helper
 */
const titleCase = (str: string): string => {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
};

/**
 * Generates the changed pages section
 */
const generateChangedPagesSection = (
	changedPages: PageChange[],
	globalBundleCurrent: BundleStats,
	globalBundleBase: BundleStats,
	options: BundleAnalysisOptions,
): string => {
	const plural = changedPages.length > 1 ? "s" : "";
	const count = titleCase(toWords(changedPages.length));

	let section = `### ${count} Page${plural} Changed Size\n\n`;
	section += `The following page${plural} changed size from the code in this PR compared to its base branch:\n\n`;

	const table = markdownTable(
		changedPages,
		globalBundleCurrent,
		globalBundleBase,
		options,
	);
	section += `${table}\n`;

	if (options.showDetails !== false) {
		const budgetPercentIncreaseRed = options.budgetPercentIncreaseRed ?? 20;
		section += `<details>
<summary>Details</summary>
<p>Only the gzipped size is provided here based on <a href='https://twitter.com/slightlylate/status/1412851269211811845'>an expert tip</a>.</p>
<p><strong>First Load</strong> is the size of the global bundle plus the bundle for the individual page. If a user were to show up to your website and land on a given page, the first load size represents the amount of javascript that user would need to download. If <code>next/link</code> is used, subsequent page loads would only need to download that page's bundle (the number in the "Size" column), since the global bundle has already been downloaded.</p>
<p>Any third party scripts you have added directly to your app using the <code>&lt;script&gt;</code> tag are not accounted for in this analysis</p>
${
	options.budget && globalBundleCurrent
		? `<p>The "Budget %" column shows what percentage of your performance budget the <strong>First Load</strong> total takes up. For example, if your budget was 100kb, and a given page's first load size was 10kb, it would be 10% of your budget. You can also see how much this has increased or decreased compared to the base branch of your PR. If this percentage has increased by ${budgetPercentIncreaseRed}% or more, there will be a red status indicator applied, indicating that special attention should be given to this. If you see "+/- <0.01%" it means that there was a change in bundle size, but it is a trivial enough amount that it can be ignored.</p>`
		: `<p>Next to the size is how much the size has increased or decreased compared with the base branch of this PR. If this percentage has increased by ${budgetPercentIncreaseRed}% or more, there will be a red status indicator applied, indicating that special attention should be given to this.</p>`
}
</details>\n`;
	}

	return section;
};

/**
 * Main function to generate the output
 */
const generateOutput = (
	packageName: string,
	globalChanges: PageChange | null,
	newPages: PageChange[],
	changedPages: PageChange[],
	globalBundleCurrent: BundleStats,
	globalBundleBase: BundleStats,
	options: BundleAnalysisOptions,
): string => {
	const sections: string[] = [
		`## 📦 Next.js Bundle Analysis for ${packageName}\n\nThis analysis was generated by the [Next.js Bundle Analysis action](https://github.com/hashicorp/nextjs-bundle-analysis). 🤖\n`,
	];

	if (globalChanges) {
		sections.push(generateGlobalSection(globalChanges, options));
	}

	if (newPages.length > 0) {
		sections.push(
			generateNewPagesSection(newPages, globalBundleCurrent, options),
		);
	}

	if (changedPages.length > 0) {
		sections.push(
			generateChangedPagesSection(
				changedPages,
				globalBundleCurrent,
				globalBundleBase,
				options,
			),
		);
	}

	const hasNoChanges =
		!newPages.length && !changedPages.length && !globalChanges;
	if (hasNoChanges) {
		sections.push("This PR introduced no changes to the JavaScript bundle! 🙌");
	}

	sections.push(`<!-- __NEXTJS_BUNDLE_${packageName} -->`);

	return sections.join("");
};

/**
 * Main execution
 */
async function main() {
	try {
		// Pull options from `package.json`
		const options = await getOptions();
		const buildOutputDirectory = getBuildOutputDirectory(options);

		// Import the current and base branch bundle stats
		const currentBundlePath = path.join(
			process.cwd(),
			buildOutputDirectory,
			"analyze/__bundle_analysis.json",
		);
		const baseBundlePath = path.join(
			process.cwd(),
			buildOutputDirectory,
			"analyze/base/bundle/__bundle_analysis.json",
		);

		const [currentBundleData, baseBundleData] = await Promise.all([
			readFile(currentBundlePath, "utf8").then((data) => JSON.parse(data)),
			readFile(baseBundlePath, "utf8").then((data) => JSON.parse(data)),
		]);

		const currentBundle = currentBundleData as BundleData;
		const baseBundle = baseBundleData as BundleData;

		// Extract global bundles
		const globalBundleCurrent = currentBundle.__global;
		const globalBundleBase = baseBundle.__global;

		// Analyze global bundle changes
		const globalBundleChanges = analyzeGlobalBundle(
			globalBundleCurrent,
			globalBundleBase,
			options.minimumChangeThreshold,
		);

		// Analyze page changes
		const { newPages, changedPages } = analyzePages(
			currentBundle,
			baseBundle,
			options.minimumChangeThreshold,
		);

		// Generate output
		const output = generateOutput(
			options.name,
			globalBundleChanges,
			newPages,
			changedPages,
			globalBundleCurrent,
			globalBundleBase,
			options,
		);

		// Check if we should skip empty comments
		const hasNoChanges =
			!newPages.length && !changedPages.length && !globalBundleChanges;
		const finalOutput =
			hasNoChanges && options.skipCommentIfEmpty ? "" : output.trim();

		// Log output for debugging
		console.log(finalOutput);

		// Write output to file
		const outputPath = path.join(
			process.cwd(),
			buildOutputDirectory,
			"analyze/__bundle_analysis_comment.txt",
		);
		await writeFile(outputPath, finalOutput);
	} catch (error) {
		console.error("Error during bundle analysis comparison:", error);
		process.exit(1);
	}
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
