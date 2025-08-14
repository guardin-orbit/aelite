from .commands import COMMANDS

def execute_script(script: str, command_type: str = "command"):
    # Сохраняем оригинальные переносы строк
    lines = script.splitlines(keepends=True)
    
    blocks = []
    current_block = []
    
    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            # Сохраняем пустые строки как часть текущего блока
            current_block.append(line)
            continue
            
        first_word = stripped_line.split(maxsplit=1)[0]
        if first_word in COMMANDS:
            # Начало новой команды
            if current_block:
                blocks.append(current_block)
            current_block = [line]
        else:
            # Продолжение предыдущей команды с сохранением переносов
            current_block.append(line)
    
    if current_block:
        blocks.append(current_block)
    
    for block in blocks:
        if not block:
            continue
            
        # Первая строка блока - команда
        command_line = block[0].strip()
        command_parts = command_line.split()
        if not command_parts:
            continue
            
        command = command_parts[0]
        args = command_parts[1:]
        
        # Обрабатываем остальные строки блока
        additional_lines = []
        for line in block[1:]:
            # Сохраняем оригинальные переносы
            if line.endswith('\r\n'):
                additional_lines.append(line[:-2])
            elif line.endswith('\n'):
                additional_lines.append(line[:-1])
            else:
                additional_lines.append(line)
        
        # Добавляем как отдельные аргументы или один многострочный
        if additional_lines:
            args.append('\n'.join(additional_lines))
        
        handler = COMMANDS.get(command)
        if handler:
            try:
                if command_type == "get":
                    result = handler(args)
                    # Гарантируем, что результат - строка с сохранёнными переносами
                    return str(result) if result is not None else ""
                else:
                    handler(args)
            except Exception as e:
                print(f"[Ошибка] Ошибка выполнения команды {command}: {str(e)}")
        else:
            print(f"[Ошибка] Неизвестная команда: {command}")
    
    return ""  # Возвращаем пустую строку по умолчанию