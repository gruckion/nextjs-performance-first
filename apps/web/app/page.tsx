"use client";

import { Button } from "@workspace/ui/components/button";
import { MASSIVE_STATIC_DATA, MASSIVE_STRING } from "./massive-data";

// Generate a massive static JSON payload at build time
const generateMassiveData = () => {
	const data = {
		users: Array.from({ length: 1000 }, (_, i) => ({
			id: `user-${i}`,
			name: `User ${i}`,
			email: `user${i}@example.com`,
			age: Math.floor(Math.random() * 50) + 20,
			country: ["USA", "UK", "Canada", "Australia", "Germany"][
				Math.floor(Math.random() * 5)
			],
			preferences: {
				theme: ["dark", "light", "auto"][Math.floor(Math.random() * 3)],
				notifications: Math.random() > 0.5,
				language: ["en", "es", "fr", "de", "it"][Math.floor(Math.random() * 5)],
			},
			metadata: {
				createdAt: new Date(
					Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
				lastLogin: new Date(
					Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
				).toISOString(),
				loginCount: Math.floor(Math.random() * 1000),
				tags: Array.from({ length: 10 }, (_, j) => `tag-${i}-${j}`),
			},
			settings: Array.from({ length: 50 }, (_, j) => ({
				key: `setting-${j}`,
				value: `value-${i}-${j}`,
				enabled: Math.random() > 0.5,
			})),
		})),
		products: Array.from({ length: 500 }, (_, i) => ({
			id: `product-${i}`,
			name: `Product ${i}`,
			description: `This is a detailed description for product ${i}. `.repeat(
				10,
			),
			price: (Math.random() * 1000).toFixed(2),
			categories: Array.from({ length: 5 }, (_, j) => `category-${j}`),
			inventory: {
				available: Math.floor(Math.random() * 1000),
				reserved: Math.floor(Math.random() * 100),
				warehouse: Array.from({ length: 10 }, (_, j) => ({
					location: `warehouse-${j}`,
					quantity: Math.floor(Math.random() * 100),
				})),
			},
		})),
		analytics: {
			daily: Array.from({ length: 365 }, (_, i) => ({
				date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
				views: Math.floor(Math.random() * 10000),
				clicks: Math.floor(Math.random() * 5000),
				conversions: Math.floor(Math.random() * 1000),
				revenue: (Math.random() * 10000).toFixed(2),
			})),
		},
	};

	return data;
};

// Generate the data at build time - this will be included in the bundle
const MASSIVE_JSON_DATA = generateMassiveData();
const JSON_STRING = JSON.stringify(MASSIVE_JSON_DATA, null, 2);

export default function Page() {
	return (
		<div className="min-h-screen p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold mb-4">Massive JSON Payload Test</h1>
				<p className="text-lg mb-2">
					Static Data Size: {(MASSIVE_STRING.length / 1024 / 1024).toFixed(2)}{" "}
					MB
				</p>
				<p className="text-lg mb-2">
					Dynamic Data Size: {(JSON_STRING.length / 1024 / 1024).toFixed(2)} MB
				</p>
				<p className="text-sm text-gray-600 mb-4">
					This page includes both static and dynamic JSON payloads to test
					bundle size analysis
				</p>
				<Button
					onClick={() => {
						console.log("Static data:", MASSIVE_STATIC_DATA);
						console.log("Dynamic data:", MASSIVE_JSON_DATA);
						alert(
							`Static: ${MASSIVE_STATIC_DATA.users.length} users, Dynamic: ${MASSIVE_JSON_DATA.users.length} users`,
						);
					}}
				>
					Log All Data
				</Button>
				<div className="mt-8 p-4 bg-gray-100 rounded-lg overflow-auto max-h-96">
					<h2 className="font-bold mb-2">Static Data Preview:</h2>
					<pre className="text-xs whitespace-pre-wrap font-mono mb-4">
						{MASSIVE_STRING.slice(0, 2000)}...
					</pre>
					<h2 className="font-bold mb-2">Dynamic Data Preview:</h2>
					<pre className="text-xs whitespace-pre-wrap font-mono">
						{JSON_STRING.slice(0, 2000)}...
					</pre>
				</div>
			</div>
		</div>
	);
}
