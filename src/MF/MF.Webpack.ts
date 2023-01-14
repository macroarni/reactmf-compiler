import { resolve } from 'path';
import { execSync } from 'child_process';
import { Configuration } from 'webpack';
import { Plugins, MFConfig, I, Constants } from './index';

export default class implements I.IMFWebpack {

  private readonly currentPath: string;
  private readonly mfConfig: I.IMFConfig;
  private readonly webPackPlugins: I.IPlugins;
  private readonly configs: Configuration;

  constructor({
    configPath = Constants.DEFAULT_CONFIG_PATH,
    isShell = false,
    ...configuration
  }: I.MFConfiguration) {

    if (isShell) {
      this.execJsonFile();
    }

    this.configs = configuration;
    this.currentPath = resolve(process.cwd(), configPath);
    this.mfConfig = MFConfig(this.currentPath);
    this.webPackPlugins = new Plugins(this.currentPath, isShell);

    this.init();
  }

  private execJsonFile(): void {
    let execCommand = "macrof createShellJson";

    if (
        (process.env.REACT_APP_DEV_AS_PROD === "TRUE" &&
         process.env.NODE_ENV === "development") ||
        process.env.NODE_ENV !== "development"
    ) {
      execCommand += " prod";
    }

    execSync(execCommand, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
  }

  private init(): void {

    if (!this.configs.output?.path && this.mfConfig.version) {
      const relativePath = this.mfConfig.version ? `dist/${this.mfConfig.version}` : `dist`;
      this.configs.output = {...(this.configs.output ?? {}), path: resolve(__dirname, relativePath)};
    }

    if (!this.configs.plugins) {
      this.configs.plugins = []
    }

    this.configs.plugins.push(this.webPackPlugins.plugins());
  }

  public configure(): Configuration {
    return this.configs;
  }
}
