import { Button } from "@workspace/ui/components/button";
import * as LucideIcons from "lucide-react";

export default function Page() {
	// This will force the entire lucide-react library to be included
	const iconNames = Object.keys(LucideIcons);
	console.log(`Loaded ${iconNames.length} icons`);
	
	return (
		<div className="flex items-center justify-center min-h-svh">
			<div className="flex flex-col items-center justify-center gap-4">
				<h1 className="text-2xl font-bold">Hello World!</h1>
				<Button size="sm">Button</Button>
				<div className="flex gap-2">
					<LucideIcons.AlertCircle className="w-6 h-6" />
					<LucideIcons.Info className="w-6 h-6" />
					<LucideIcons.CheckCircle className="w-6 h-6" />
					<LucideIcons.XCircle className="w-6 h-6" />
				</div>
				<p className="text-sm text-gray-500">
					Total icons available: {iconNames.length}
				</p>
			</div>
		</div>
	);
}
