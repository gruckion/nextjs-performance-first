/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

// Strong typing for configuration
export interface NextBundleAnalysisConfig {
	budget?: number;
	budgetPercentIncreaseRed?: number;
	buildOutputDirectory?: string;
	minimumChangeThreshold?: number;
	showDetails?: boolean;
	skipCommentIfEmpty?: boolean;
}

interface PackageJson {
	name: string;
	nextBundleAnalysis?: NextBundleAnalysisConfig;
}

export interface BundleAnalysisOptions extends NextBundleAnalysisConfig {
	name: string;
}

/**
 * Reads options from `package.json` asynchronously
 */
export const getOptions = async (
	pathPrefix: string = process.cwd(),
): Promise<BundleAnalysisOptions> => {
	const packageJsonPath = path.join(pathPrefix, "package.json");
	const packageJsonContent = await readFile(packageJsonPath, "utf8");
	const packageJson: PackageJson = JSON.parse(packageJsonContent);

	return {
		...packageJson.nextBundleAnalysis,
		name: packageJson.name,
	};
};

/**
 * Gets the output build directory, defaults to `.next`
 */
export const getBuildOutputDirectory = (
	options: BundleAnalysisOptions,
): string => options.buildOutputDirectory ?? ".next";
