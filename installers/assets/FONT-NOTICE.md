# Installer typeface

Voice Sans is a renamed static build of Noto Sans SC, distributed under the SIL Open Font License 1.1 in `OFL.txt`. The derivative family is renamed Voice Sans. Regular and SemiBold are static instances of weights 400 and 600. Both faces retain all 30,890 source codepoints, including Chinese characters used in custom folder names. They are stored as raw DEFLATE streams, decompressed in memory and registered only in the installer process; they are not installed into the operating system. Separate regular and semibold families avoid platform-specific weight substitution. Regenerate with `scripts/prepare_installer_fonts.py --source NotoSansSC.ttf`.

Source: https://github.com/google/fonts/tree/main/ofl/notosanssc

Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name Source.

Source variable TTF SHA256: `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`.
