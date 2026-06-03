package com.eqms.cli;

import java.util.concurrent.Callable;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

/**
 * Entry point for eQMS operational/admin command-line utilities.
 *
 * <p>Skeleton only for Milestone 0 — provides the Picocli wiring and a {@code version}
 * subcommand so the module builds and runs. Real utilities (e.g. seed reference data,
 * verify audit-trail integrity) are added in later milestones, and must call the same
 * backend services/APIs so that all regulated actions stay audited and server-timestamped.</p>
 */
@Command(
        name = "eqms",
        mixinStandardHelpOptions = true,
        version = "eqms-cli 0.1.0",
        description = "Pharmaceutical eQMS command-line utilities.",
        subcommands = { EqmsCli.VersionCommand.class }
)
public class EqmsCli implements Callable<Integer> {

    @Override
    public Integer call() {
        // No subcommand given: show usage.
        CommandLine.usage(this, System.out);
        return 0;
    }

    public static void main(String[] args) {
        int exitCode = new CommandLine(new EqmsCli()).execute(args);
        System.exit(exitCode);
    }

    @Command(name = "version", description = "Print the CLI version.")
    static class VersionCommand implements Callable<Integer> {

        @Option(names = {"-q", "--quiet"}, description = "Print only the version number.")
        boolean quiet;

        @Override
        public Integer call() {
            System.out.println(quiet ? "0.1.0" : "eqms-cli version 0.1.0");
            return 0;
        }
    }
}
