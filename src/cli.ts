#!/usr/bin/env node
import { createCliProgram } from "./cli/index.js";

const program = createCliProgram();
program.parse(process.argv);
