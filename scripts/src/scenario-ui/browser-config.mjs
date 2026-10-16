export const engines = ["chromium", "firefox", "webkit"];

export function browserProfile(args = []) {
  if (args.length > 1 || args.some(arg => !arg.startsWith("--browser="))) {
    throw new Error("Use one --browser=chromium|firefox|webkit argument");
  }
  const engine = args[0]?.slice("--browser=".length) ?? "chromium";
  if (!engines.includes(engine)) throw new Error(`Unsupported browser "${engine}". Use chromium, firefox or webkit; WebKit is not Apple Safari.`);
  return {
    engine,
    outputSuffix: engine === "chromium" ? "" : engine,
    browserProduct: engine === "webkit" ? "Playwright WebKit (not Apple Safari)" : engine === "firefox" ? "Playwright Firefox" : "Chromium",
    appleSafariVerified: false,
  };
}
