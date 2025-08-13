from .commands import COMMANDS

def execute_script(script: str, command_type: str = "command"):
    lines = script.strip().splitlines()
    blocks = []

    current_block = []
    for line in lines:
        if not line.strip():
            continue

        first_word = line.strip().split(maxsplit=1)[0]
        if first_word in COMMANDS:
            # Начало новой команды
            if current_block:
                blocks.append(current_block)
            current_block = [line]
        else:
            # Продолжение предыдущей команды
            current_block.append(line)

    if current_block:
        blocks.append(current_block)

    for block in blocks:
        command_line = block[0].strip()
        command_parts = command_line.split()
        command = command_parts[0]
        args = command_parts[1:]

        # Добавляем все последующие строки как часть аргументов
        if len(block) > 1:
            args.append('\n'.join(block[1:]))

        handler = COMMANDS.get(command)
        if handler:
            if command_type == "get":
                return handler(args)
            handler(args)
        else:
            print(f"[Ошибка] Неизвестная команда: {command}")
