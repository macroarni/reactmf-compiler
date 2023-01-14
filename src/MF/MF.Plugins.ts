require('dotenv').config();

import { container, DefinePlugin, BannerPlugin, Configuration } from 'webpack';
import DynamicRemote from "../Plugins/DynamicRemotes";
import { MFConfig, I, Constants, Utils } from './index';

export default class implements I.IPlugins {

  private readonly mfConfig: I.IMFConfig;
  private readonly depURLs: Record<string, string | string[]>;
  private readonly config: I.ModuleFederationPluginOptions;
  private readonly metaData: Record<string, {}>;
  private readonly appId: string;
  private readonly isShell: boolean;

  constructor(currentPath: string, isShell: boolean) {
    this.mfConfig = MFConfig(currentPath);
    this.isShell = isShell;
    this.appId = Constants.APP_ID;

    const {
      main = Constants.DEFAULT_DEPENDENCY_CONFIG_MAIN,
      exports,
      dependencies,
      version,
      registry,
      ...otherConfig
    } = this.mfConfig;

    if (typeof registry !== 'undefined' && typeof this.mfConfig.registry !== 'string') {
      throw new Error("typeof registry !== 'undefined' && typeof registry !== 'string'");
    }

    this.depURLs = {};
    this.config = {...otherConfig, filename: main, exposes: {}};

    if (Array.isArray(exports)) {
      const exposes = {};

      Object.assign(this.config.exposes || {}, exports.reduce((acc, name) =>
              Object.assign(acc, {[name]: name}),
          exposes)
      );
    } else if (typeof this.mfConfig.exports !== 'undefined') {
      throw new Error("!Array.isArray(exports) && typeof mfConfig.exports !== 'undefined'");
    }

    if (dependencies) {
      this.collectDependencies(dependencies);
    }

    this.metaData = {
      dependencies: (typeof registry !== 'undefined' ? dependencies : this.depURLs) ?? {},
      ...(registry ? {registry} : {}),
      ...(version ? {version} : {}),
    };
  }

  private collectDependencies(dependencies: Record<string, I.DependencyConfig | string>): void {
    if (typeof dependencies !== 'object') {
      throw new Error("typeof dependencies !== 'object'");
    } else {
      this.config.remotes = Object.entries(dependencies).reduce(
          (
              previousValue: Record<string, I.RemotesConfig>,
              [dependency, dependencyConfig]: [string, I.DependencyConfig | string]
          ) => {
            if (typeof this.mfConfig.registry !== 'undefined') {
              if (typeof dependencyConfig !== 'string') {
                throw new Error("typeof dependencyConfig !== 'string'");
              }

              return previousValue;
            }

            if (typeof dependencyConfig === 'string') {
              this.depURLs[dependency] =
                process.env.REACT_APP_DEV_AS_PROD !== "TRUE" &&
                process.env.NODE_ENV === "development"
                  ? Utils.getUrl(dependencyConfig)
                  : dependencyConfig;
              return Object.assign(previousValue, {[dependency]: `${dependency}@${dependencyConfig}`});
            } else if (typeof dependencyConfig === 'object') {

              let external = dependencyConfig.external;

              if (!external) {
                 if (typeof dependencyConfig.host !== 'string') {
                   throw new Error("typeof dependencyConfig.host !== 'string'");
                 }

                 external = `${dependency}@${dependencyConfig.host}${
                   /\/$/.test(dependencyConfig.host) ? '' : '/'
                 }${dependencyConfig.main ?? Constants.DEFAULT_DEPENDENCY_CONFIG_MAIN}`;
              }

              const remoteConfig: I.RemotesConfig = { external };

              if (dependencyConfig.shareScope) {
                remoteConfig.shareScope = dependencyConfig.shareScope;
              }

              if (Array.isArray(external)) {
                this.depURLs[dependency] = external.map(Utils.getUrl);
              } else {
                this.depURLs[dependency] = Utils.getUrl(external);
              }

              return Object.assign(previousValue, {[dependency]: remoteConfig});
            } else {
              throw new Error("typeof dependencyConfig !=== 'string' && typeof dependencyConfig !=== 'object'");
            }
          }, {} as Record<string, I.RemotesConfig>
      );
    }
  }

  private collectPlugins({ webpackConfig, context: {paths} }: I.OverridePlugins): Configuration {
    let currentWebpackConfig: Configuration = webpackConfig;

    if (!currentWebpackConfig.output) {
      currentWebpackConfig.output = {};
    }

    if (!currentWebpackConfig.optimization) {
      currentWebpackConfig.optimization = {};
    }

    if (!currentWebpackConfig.plugins) {
      currentWebpackConfig.plugins = [];
    }

    if (this.isShell) {
      const htmlWebpackPlugin = currentWebpackConfig.plugins.find((plugin: any) =>
          plugin.constructor.name === "HtmlWebpackPlugin"
      ) as any;

      htmlWebpackPlugin.userOptions = {
        ...htmlWebpackPlugin.userOptions,
        publicPath: paths.publicUrlOrPath,
        excludeChunks: [`MF${this.mfConfig.name}`],
      };

      currentWebpackConfig.output.filename = 'static/js/bundle.[name].[id].[contenthash].js';
    } else {
      currentWebpackConfig.output.publicPath = "auto";
      currentWebpackConfig.output.chunkFilename = '[id].[contenthash].js';
      currentWebpackConfig.optimization.chunkIds = "named";
    }

    (currentWebpackConfig.plugins[5] as any).options.filename = 'static/css/bundle.[name].[id].[contenthash].css';

    currentWebpackConfig.optimization = {
      runtimeChunk: false,
        splitChunks: {
        chunks(): boolean {
          return false
        },
      },
    };

    currentWebpackConfig.plugins = [
      ...currentWebpackConfig.plugins,
      new BannerPlugin({
        banner: `
        window.${this.appId} = window.${this.appId} ? window.${this.appId} : {};
        if (!window.${this.appId}['${
          this.mfConfig.name
        }']) window.${this.appId}['${ this.mfConfig.name}'] = ${JSON.stringify(
          this.metaData
        )};`,
        include: `${this.config.filename}`,
        raw: true,
      }),
      new DefinePlugin({
        'process.env.APP_NAME': JSON.stringify(`${this.mfConfig.name}`),
        'process.env.FPM_DEPS': JSON.stringify(`${JSON.stringify(this.metaData)}`),
        'process.env.FPM_REG': JSON.stringify(this.mfConfig.registry),
        ...(typeof this.mfConfig.registry !== 'undefined' ? {
            'process.env.FPM_MAP': JSON.stringify(`${JSON.stringify(this.mfConfig.dependencies ?? {})}`),
          } : {'process.env.DEP_URLS': JSON.stringify(`${JSON.stringify(this.depURLs)}`)}
        ),
      }),
      new container.ModuleFederationPlugin({...this.config}),
    ];

    if (this.isShell) {
      currentWebpackConfig.plugins?.push(new DynamicRemote());
    }

    if (currentWebpackConfig.resolve) {
      const scopePluginIndex = currentWebpackConfig.resolve.plugins?.findIndex(
        ({ constructor }: any) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      scopePluginIndex && currentWebpackConfig.resolve.plugins?.splice(scopePluginIndex, 1);
    }

    return currentWebpackConfig;
  }

  public plugins(): I.Plugins {
    return {
      plugin: {
        overrideWebpackConfig: this.collectPlugins.bind(this)
      },
    } as unknown as I.Plugins
  }
}
