# claude-code-mods-usage-bar

A small [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) that draws your remaining plan usage in the band above the prompt: one bar for the 5-hour window, one for the weekly window, each with a countdown to its reset.

```text
5h █████████░ 87% ↻ 35m   Week ██████████ 95% ↻ 5d0h
```

This repository is the companion code of the tutorial **Claude Code mods: building a usage bar above the prompt, step by step**:

- English: https://cool-solution.com/en/blog/claude-code-mods-usage-bar-tutorial-2026
- Italiano: https://cool-solution.com/blog/claude-code-mods-usage-bar-tutorial-2026

## Scope

The repository holds the exact files the article builds, so you can read them next to the tutorial, run them, and change them. It is a teaching example, not a product: the code is short on purpose (one hooks module of about 125 lines).

What the mod shows:

- how a mod reads data Claude Code already has (`$.session.usage()` and the `session.measure` event)
- how to keep that data in reactive state (`$.state` with `atom`, `read`, `update`)
- how to draw in the band above the prompt (`ui.render` on the `AbovePrompt` site)
- how to run a timer (`$.clock.every`), add a command (`/usage-bar`) and open a pane
- how to test a mod without a session (`claude plugin test`)

## Requirements

- Claude Code **2.1.287 or later** in the terminal. Check with `claude --version`.
- Mods are on by default. The drawing appears in the terminal and in the Code tab of the Claude Desktop app.
- No Node.js, bundler or build step: Claude Code loads the `.tsx` file directly.

## Technologies

- Claude Code mods (plugin with a hooks module)
- TypeScript and TSX
- `claude plugin validate` and `claude plugin test`

## Try it without installing

Clone the repository and load the mod for one session:

```bash
git clone https://github.com/fscamuzzi/claude-code-mods-usage-bar.git
cd claude-code-mods-usage-bar
claude --plugin-dir ./usage-bar
```

The bars appear above the prompt after the first response of the session, because the figures come from the last API response. Run `/usage-bar` to open the same bars in a pane.

While the session runs, edit `usage-bar/hooks/register.tsx` and save: Claude Code reloads the mod.

## Install it in every session

The repository is also a plugin marketplace named `coolsolution-mods`.

At the prompt of a Claude Code session:

```text
/plugin marketplace add fscamuzzi/claude-code-mods-usage-bar
/plugin install usage-bar@coolsolution-mods
/reload-plugins
```

Or from a shell:

```bash
claude plugin marketplace add fscamuzzi/claude-code-mods-usage-bar
claude plugin install usage-bar@coolsolution-mods
```

To check that it loaded, run `/plugin`: a line under the tabs reads `1 mod active · usage-bar`.

To remove it:

```bash
claude plugin uninstall usage-bar@coolsolution-mods
claude plugin marketplace remove coolsolution-mods
```

## Check and test

Read what the mod does without running it, then run its test:

```bash
claude plugin validate ./usage-bar
cd usage-bar && claude plugin test
```

`validate` lists the events the mod handles and every API method it calls:

```text
hooks: session.start, session.measure, ui.render{component=AbovePrompt}, command.run{command=usage-bar}, ui.render{component=Pane, requestId=usage-bar}
calls: $.clock.every, $.clock.now, $.command.register, $.session.usage (via refreshLimits), $.state.get, $.state.set, $.ui.log, $.ui.open, $.ui.resolve
```

The mod does not call `$.fs`, `$.process` or `$.http`: it reads the usage, keeps a state and draws. A mod runs with your permissions and is not sandboxed, so read those two lines before you install any mod.

## Repository layout

```text
.
├── .claude-plugin/
│   └── marketplace.json       # makes this repository a marketplace
└── usage-bar/                 # the mod (a Claude Code plugin)
    ├── .claude-plugin/
    │   └── plugin.json        # the plugin manifest
    ├── hooks/
    │   ├── hooks.json         # points to the hooks module
    │   └── register.tsx       # the mod's code
    ├── types/
    │   └── index.d.ts         # the values kept in $.state
    └── tests/
        └── register.test.ts   # the test for claude plugin test
```

## Limits of this example

- The bars do not adapt to a narrow terminal. A fuller version would fit them to `e.props.bodyColumns` and to the band's `maxRows`.
- Before the first response of a session there is no reading, so the band stays empty.
- The events and methods of the mods API can change between Claude Code releases. This code was validated and tested with Claude Code 2.1.322.

## License

MIT. See [LICENSE](LICENSE).
