import Constants from "expo-constants";

type BuildInfoInput = {
  appVersion?: string;
  webBuildNumber?: string;
  gitSha?: string;
};

function resolveAppVersion(input?: BuildInfoInput) {
  const fromInput = input?.appVersion?.trim();
  if (fromInput) return fromInput;

  const fromEnv = process.env.EXPO_PUBLIC_APP_VERSION?.trim();
  if (fromEnv) return fromEnv;

  const fromExpoConfig = Constants.expoConfig?.version?.trim();
  if (fromExpoConfig) return fromExpoConfig;

  return "dev";
}

export function getPublicBuildLabel(input?: BuildInfoInput) {
  const version = resolveAppVersion(input);
  const build = input?.webBuildNumber?.trim() || process.env.EXPO_PUBLIC_WEB_BUILD_NUMBER?.trim();
  const sha = input?.gitSha?.trim() || process.env.EXPO_PUBLIC_GIT_SHA?.trim();

  if (build && sha) return `v${version} build ${build} (${sha})`;
  if (build) return `v${version} build ${build}`;
  return `v${version}`;
}
