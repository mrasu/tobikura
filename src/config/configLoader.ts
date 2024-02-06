import { Comparable } from "@/comparision/comparable";
import { Eq } from "@/comparision/eq";
import {
  Config,
  ECHOED_CONFIG_FILE_NAME,
  OpenApiConfig,
  ProtoConfig,
  ServiceConfig,
} from "@/config/config";
import { InvalidConfigError } from "@/config/invalidConfigError";
import { PropagationTestConfig } from "@/config/propagationTestConfig";
import {
  DEFAULT_SCENARIO_COMPILE_OUT_DIR,
  DEFAULT_SCENARIO_COMPILE_YAML_DIR,
  ScenarioCompileConfig,
  ScenarioCompilePluginAsserterConfig,
  ScenarioCompilePluginConfig,
  ScenarioCompilePluginImportConfig,
  ScenarioCompilePluginRunnerConfig,
} from "@/config/scenarioCompileConfig";
import { Logger } from "@/logger";
import { ConfigSchema } from "@/schema/configSchema";
import {
  ConfigSchemaZod,
  PartialConfigSchemaZod,
} from "@/schema/configSchemaZod";
import { JsonSchema } from "@/type/jsonZod";
import { statSync } from "@/util/file";
import { override, transformRecord } from "@/util/record";
import { formatZodError } from "@/util/zod";
import fs from "fs";
import yaml from "js-yaml";
import { SafeParseReturnType } from "zod";

type YamlValue = string | boolean | number | null;

// value of `overrides` in create/template/.echoed.yml
const EXAMPLE_TEMPLATE_OVERRIDDEN_CONFIG_PATH = "./example/.echoed.yml";

type scenarioCompile = NonNullable<ConfigSchema["scenario"]>["compile"];

export class ConfigLoader {
  constructor() {}

  loadFromFile(filepath: string): Config {
    const result = this.readFileRecursively(filepath);

    if (!result.success) {
      throw new InvalidConfigError(
        `Failed to parse configuration: ${formatZodError(result.error)}`,
      );
    }

    return this.loadFromObject(result.data);
  }

  private readFileRecursively(
    filepath: string,
  ): SafeParseReturnType<ConfigSchemaZod, ConfigSchemaZod> {
    const schemaObject = this.readFile(filepath, false);
    const config = ConfigSchemaZod.safeParse(schemaObject);

    if (!config.success) {
      return config;
    }

    let configData = config.data;

    if (configData.overrides) {
      for (const filepath of configData.overrides) {
        const overridden = this.readFileRecursivelyOverridden(filepath);
        if (!overridden.success) {
          return overridden;
        }
        configData = override(configData, overridden.data);
      }
    }

    return { success: true, data: configData };
  }

  private readFileRecursivelyOverridden(
    filepath: string,
  ): SafeParseReturnType<PartialConfigSchemaZod, PartialConfigSchemaZod> {
    const schemaObject = this.readFile(filepath, true);
    const partial = PartialConfigSchemaZod.safeParse(schemaObject);

    if (!partial.success) {
      return partial;
    }

    let partialData = partial.data;

    if (partialData.overrides) {
      for (const filepath of partialData.overrides) {
        const overridden = this.readFileRecursivelyOverridden(filepath);
        if (!overridden.success) {
          return overridden;
        }
        partialData = override(partialData, overridden.data);
      }
    }

    return { success: true, data: partialData };
  }

  private readFile(filepath: string, overridden: boolean): unknown {
    const overriddenTxt = overridden ? "overridden " : "";

    const stat = statSync(filepath);
    if (!stat) {
      if (overridden && filepath === EXAMPLE_TEMPLATE_OVERRIDDEN_CONFIG_PATH) {
        Logger.warn(`config file not found: ${filepath}`);
        Logger.warn(
          "When you delete `example` directory, remove `overrides` section in `" +
            ECHOED_CONFIG_FILE_NAME +
            "` too.",
        );
      }

      throw new InvalidConfigError(
        `${overriddenTxt}config file not found: ${filepath}`,
      );
    }

    if (!stat.isFile()) {
      throw new InvalidConfigError(
        `${overriddenTxt}config file is not a file: ${filepath}`,
      );
    }

    const schemaObject = yaml.load(fs.readFileSync(filepath, "utf-8"));
    return schemaObject;
  }

  loadFromObject(schemaObject: ConfigSchema): Config {
    if (schemaObject.output === "") {
      throw new InvalidConfigError(
        "Invalid report option. `output` is required",
      );
    }

    return new Config(
      schemaObject.output,
      schemaObject.serverPort ?? 3000,
      schemaObject.serverStopAfter ?? 20,
      schemaObject.debug ?? false,
      this.convertPropagationTestConfig(schemaObject.propagationTest),
      this.convertServiceConfigs(schemaObject.services),
      this.convertScenarioCompileConfig(schemaObject.scenario?.compile),
    );
  }

  private convertPropagationTestConfig(
    t?: ConfigSchema["propagationTest"],
  ): PropagationTestConfig {
    const enabled = t?.enabled ?? true;
    const ignore = {
      attributes: this.convertToEqComparables(t?.ignore?.attributes),
      resource: {
        attributes: this.convertToEqComparables(
          t?.ignore?.resource?.attributes,
        ),
      },
    };

    return new PropagationTestConfig({ enabled, ignore });
  }

  private convertToEqComparables(
    values: Record<string, YamlValue> | undefined,
  ): Map<string, Comparable> {
    if (!values) return new Map();

    const ret = new Map<string, Comparable>();
    for (const [key, val] of Object.entries(values)) {
      if (val === null) continue;

      ret.set(key, new Eq(val));
    }
    return ret;
  }

  private convertServiceConfigs(
    services: ConfigSchema["services"] | undefined,
  ): ServiceConfig[] {
    if (!services) return [];

    return services.map((service) => {
      return {
        name: service.name,
        namespace: service.namespace,
        openapi: this.convertOpenApiConfig(service.openapi),
        proto: this.convertProtoConfig(service.proto),
      };
    });
  }

  private convertOpenApiConfig(
    config:
      | Exclude<ConfigSchema["services"], undefined>[number]["openapi"]
      | undefined,
  ): OpenApiConfig | undefined {
    if (!config) return;

    if (typeof config === "string") {
      return {
        filePath: config,
      };
    }

    return {
      filePath: config.filePath,
      basePath: config.basePath,
    };
  }

  private convertProtoConfig(
    config:
      | Exclude<ConfigSchema["services"], undefined>[number]["proto"]
      | undefined,
  ): ProtoConfig | undefined {
    if (!config) return;

    if (typeof config === "string") {
      return {
        filePath: config,
      };
    }

    return {
      filePath: config.filePath,
      services: config.services,
    };
  }

  private convertScenarioCompileConfig(
    compile: scenarioCompile | undefined,
  ): ScenarioCompileConfig | undefined {
    if (!compile) return;

    return new ScenarioCompileConfig(
      compile.outDir ?? DEFAULT_SCENARIO_COMPILE_OUT_DIR,
      compile.cleanOutDir ?? false,
      compile.yamlDir ?? DEFAULT_SCENARIO_COMPILE_YAML_DIR,
      compile.retry ?? 0,
      compile.env ?? {},
      this.convertScenarioCompilePluginConfig(compile.plugin),
    );
  }

  private convertScenarioCompilePluginConfig(
    compile: NonNullable<scenarioCompile>["plugin"] | undefined,
  ): ScenarioCompilePluginConfig {
    if (!compile) return new ScenarioCompilePluginConfig([], [], []);

    const runners = compile.runners?.map(
      (runner): ScenarioCompilePluginRunnerConfig => {
        return {
          module: runner.module,
          name: runner.name,
          option: this.parseJSONRecord(runner.option),
        };
      },
    );

    const asserters = compile.asserters?.map(
      (asserter): ScenarioCompilePluginAsserterConfig => {
        return {
          module: asserter.module,
          name: asserter.name,
          option: this.parseJSONRecord(asserter.option),
        };
      },
    );

    const commons = compile.commons?.map(
      (com): ScenarioCompilePluginImportConfig => {
        return {
          module: com.module,
          names: com.names ?? [],
          default: com.default,
        };
      },
    );

    return new ScenarioCompilePluginConfig(
      runners ?? [],
      asserters ?? [],
      commons ?? [],
    );
  }

  private parseJSONRecord(
    option: Record<string, unknown> | undefined,
  ): Record<string, JsonSchema> | undefined {
    if (!option) return;

    return transformRecord(option, (v) => JsonSchema.parse(v));
  }
}
