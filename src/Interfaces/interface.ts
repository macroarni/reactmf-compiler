import {container, Configuration, WebpackPluginInstance, Compiler} from 'webpack';

export interface IMFWebpack {
  configure(): Configuration;
}

export interface MFConfiguration extends Configuration {
  configPath?: string;
  webpack?: any;
  plugins?: any;
  devServer?: any;
  eslint?: any;
  babel?: any;
  typescript?: any;
  style?: any;
  isShell?: boolean;
}

export interface RemotesConfig {
  external: string | string[];
  shareScope?: string;
}

export interface DependencyConfig {
  external?: string | string[];
  shareScope?: string;
  host?: string;
  main?: string;
}

export type ModuleFederationPluginOptions = ConstructorParameters<typeof container.ModuleFederationPlugin>[0];

export interface IMFConfig
  extends Pick<
    ModuleFederationPluginOptions,
    Exclude<keyof ModuleFederationPluginOptions, 'exposes' | 'filename' | 'remotes'>
    > {
  name: string;
  main?: string;
  exports?: string[];
  dependencies?: Record<string, DependencyConfig | string>;
  version?: string;
  registry?: string;
}

export type OverridePlugins = {
  webpackConfig: Configuration,
  context: {
    paths: {
      publicUrlOrPath: string
    }
  }
};

export type Plugins = ((this: Compiler, compiler: Compiler) => void) | WebpackPluginInstance;

export interface IPlugins {
  plugins(): Plugins;
}
