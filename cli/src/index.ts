#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { wrapCommand } from "./commands/wrap";
import { unwrapCommand } from "./commands/unwrap";
import { bridgeCommand } from "./commands/bridge";
import { statusCommand } from "./commands/status";
import { configCommand } from "./commands/config";
import { registerCommand } from "./commands/register";

const program = new Command();

program
    .name("portal")
    .description("Portal Labs CLI - Permissionless interchain layer for agents")
    .version("0.1.0");

program.addCommand(initCommand());
program.addCommand(wrapCommand());
program.addCommand(unwrapCommand());
program.addCommand(bridgeCommand());
program.addCommand(statusCommand());
program.addCommand(configCommand());
program.addCommand(registerCommand());

program.parse(process.argv);
