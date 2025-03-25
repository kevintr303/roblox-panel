import { Elysia } from 'elysia';
import { readdir, readFile, stat, access } from 'fs/promises';
import { join } from 'path';
import { errorHandler } from './validation.util';

interface PluginConfig {
  name: string;
  version: string;
  dependencies?: string[];
  enabled?: boolean;
  tag?: {
    name: string;
    description: string;
  };
  metadata?: {
    author?: string;
    license?: string;
    repository?: string;
    description?: string;
    homepage?: string;
    keywords?: string[];
  };
}

interface PluginModule {
  default: Elysia;
  config?: PluginConfig;
}

interface ApiVersion {
  majorVersion: number;
  plugins: Set<string>;
}

export const createPlugin = (plugin: Elysia): Elysia => {
  const newPlugin = errorHandler(plugin);
  return newPlugin;
};

const getMajorVersion = (version: string): number => {
  const majorVersionMatch = version.match(/^(\d+)/);
  if (!majorVersionMatch) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return parseInt(majorVersionMatch[1]!, 10);
};

const isVersionCompatible = (pluginVersion: number, apiVersion: number): boolean => {
  return pluginVersion === apiVersion;
};

const loadPluginConfig = async (pluginDir: string): Promise<PluginConfig | null> => {
  try {
    const configPath = join(pluginDir, 'plugin.config.json');
    const configContent = await readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch {
    return null;
  }
};

export const loadPlugins = async (app: Elysia, currentApiVersion: number = 1) => {
  const pluginsDir = join(process.cwd(), 'src', 'plugins');
  const pluginDirs = await readdir(pluginsDir);

  // Collect all plugin configs and tags
  const pluginConfigs = new Map<string, PluginConfig>();
  const tags: { name: string; description: string }[] = [];
  const versionMap = new Map<number, ApiVersion>();

  // Initialize current API version in the version map
  versionMap.set(currentApiVersion, {
    majorVersion: currentApiVersion,
    plugins: new Set<string>(),
  });

  // Collect plugin configs and organize by version
  for (const dir of pluginDirs) {
    const pluginDirPath = join(pluginsDir, dir);
    const stats = await stat(pluginDirPath);

    if (!stats.isDirectory()) {
      continue;
    }

    const configPath = join(pluginDirPath, 'plugin.config.json');
    const hasConfig = await access(configPath)
      .then(() => true)
      .catch(() => false);

    if (!hasConfig) {
      continue;
    }

    const pluginPath = join(pluginDirPath, `${dir}.plugin.ts`);
    const hasPluginFile = await access(pluginPath)
      .then(() => true)
      .catch(() => false);

    if (!hasPluginFile) {
      console.warn(`Plugin ${dir} is missing ${dir}.plugin.ts implementation file. Skipping.`);
      continue;
    }

    try {
      const pluginConfig = await loadPluginConfig(pluginDirPath);

      if (!pluginConfig) {
        console.warn(`Plugin ${dir} is missing plugin.config.json. Skipping.`);
        continue;
      }

      if (!pluginConfig.name || !pluginConfig.version) {
        console.warn(`Plugin ${dir} has incomplete configuration in plugin.config.json. Skipping.`);
        continue;
      }

      pluginConfigs.set(dir, pluginConfig);
      const majorVersion = getMajorVersion(pluginConfig.version);

      if (!versionMap.has(majorVersion)) {
        versionMap.set(majorVersion, {
          majorVersion,
          plugins: new Set<string>(),
        });
      }

      const versionGroup = versionMap.get(majorVersion);
      if (versionGroup) {
        versionGroup.plugins.add(dir);
      }

      if (pluginConfig.tag) {
        tags.push(pluginConfig.tag);
      }
    } catch (error) {
      console.error(`Failed to load plugin config for ${dir}:`, error);
    }
  }

  // Load plugins in dependency order, grouped by version
  const loadedPlugins = new Set<string>();

  const loadPlugin = async (dir: string, versionPrefix: string) => {
    if (loadedPlugins.has(dir)) return;

    const config = pluginConfigs.get(dir);
    if (!config) return;

    const pluginDirPath = join(pluginsDir, dir);
    const pluginFile = join(pluginDirPath, `${dir}.plugin.ts`);

    // Check if plugin is enabled
    if (config.enabled === false) {
      console.info(`Plugin ${dir} is disabled, skipping...`);
      return;
    }

    // Check version compatibility
    const pluginMajorVersion = getMajorVersion(config.version);
    if (!isVersionCompatible(pluginMajorVersion, currentApiVersion)) {
      console.warn(
        `Plugin ${dir} (v${config.version}) is not compatible with API v${currentApiVersion}, skipping...`
      );
      return;
    }

    // Load dependencies first
    if (config.dependencies && config.dependencies.length > 0) {
      for (const dep of config.dependencies) {
        if (!loadedPlugins.has(dep)) {
          // Make sure the dependency is compatible
          const depConfig = pluginConfigs.get(dep);
          if (!depConfig) {
            console.error(`Plugin ${dir} depends on ${dep} which is not found`);
            return;
          }

          const depMajorVersion = getMajorVersion(depConfig.version);
          if (isVersionCompatible(depMajorVersion, currentApiVersion)) {
            await loadPlugin(dep, versionPrefix);
          } else {
            console.error(
              `Plugin ${dir} depends on ${dep} which is not compatible with API v${currentApiVersion}`
            );
            return;
          }
        }
      }
    }

    try {
      const plugin = (await import(pluginFile)) as PluginModule;
      if (plugin.default) {
        const pluginInstance = plugin.default;
        (pluginInstance as Elysia).config = config;

        const versionedGroup = new Elysia().group(versionPrefix, (app) => app.use(pluginInstance));

        app.use(versionedGroup);

        loadedPlugins.add(dir);

        console.info(`Plugin loaded: ${config.name}`);
      } else {
        console.warn(`Plugin ${dir} has no default export`);
      }
    } catch (error) {
      console.error(`Failed to load plugin ${dir}:`, error);
    }
  };

  // Load all plugins for the current API version
  const currentVersionGroup = versionMap.get(currentApiVersion);
  if (currentVersionGroup) {
    const versionPrefix = `/api/v${currentApiVersion}`;
    for (const dir of Array.from(currentVersionGroup.plugins)) {
      await loadPlugin(dir, versionPrefix);
    }
  }

  // Return information about loaded plugins
  return {
    tags,
    versions: Array.from(versionMap.entries()).map(([version, data]) => ({
      version,
      pluginCount: data.plugins.size,
      plugins: Array.from(data.plugins),
    })),
    compatiblePlugins: Array.from(loadedPlugins),
  };
};
