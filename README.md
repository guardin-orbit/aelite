## Сервер AElite
Предназначен для развертывания на Ubuntu 24.04 LTS с дополнительными настройками.

## Зависимости
- Python (желательно версии 3.11)
- Hiddify Next
- Nginx 1.24.0

## Настройка сервера
1. Установите Python версии 3.11 (или другую если 3.11 не подходит).
2. Установите Python зависимости ```python3.11 -m pip install -r requirements.txt```
3. Установите Nginx 1.24.0 (или другой версии)
4. Замените конфиг Nginx на такой как в `Conf/nginx.conf`, не забудьте указать корректные пути в конфиге и настроить дополнительные параметры для корректной работы сервера
5. Убедитесь что ваша машина Ubuntu подключена к Ethernet или WiFi.
6. Запустите Nginx, страница `https://127.0.0.1:8000/` должна отобразить веб-интерфейс AElite
7. Из под папки `./Server` поднимите FastAPI сервер `python3.11 main.py`. Сервер должен подняться на порту `8050`.
8. Если вы используете API не требующие VPN на этом этапе ваш сервер должен быть готов к использованию. Если же ваш API требует VPN продолжаейте действия.
9. Запустите `Hiddify Next` с ROOT правами: ```cd resources``` и для запуска ```sudo ./hiddify.AppImage```
10. Настройте  `Hiddify Next`, запустите его в режиме `VPN` или `Системный прокси`. Если используте `VPN` режим убедитесь в том что на вашей Ubuntu машине включен `TUN`.
Если при использовании системного прокси вы все равно видите сообщение об ошибках локации то переключитесь на `VPN` режим и продолжайте действия.
11. `VPN` режим обычно маршрутизирует весь траффик через VPN что приведет к тому что проброс портов не сможет получить ответ от Nginx, поэтому вам необходимо выполнить инструкцию описанную в разделе "Настройка выборочной Hiddify маршрутизации" для того чтобы Nginx смог возвращать ответ клиенту через проброс портов.

### Настройка выборочной Hiddify маршрутизации

#### Первая настройка (выполняется только при первом запуске. Пример для Gemini API)
1. Установите dnsmasq и ipset
```bash
sudo apt update
sudo apt install dnsmasq ipset
```

3. Создайте ipset для домена
```bash
sudo ipset create gemini hash:ip
```

4. Откройте `/etc/dnsmasq.conf` и добавьте:
```
no-resolv
server=8.8.8.8
server=1.1.1.1
ipset=/generativelanguage.googleapis.com/gemini
```
- no-resolv — не использовать системный /etc/resolv.conf.
- server= — внешние DNS.
- ipset= — наша привязка домена к списку.

5. Освободите порт 53 от systemd-resolved
```bash
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Удаляем симлинк /etc/resolv.conf, чтобы dnsmasq мог сам управлять DNS
sudo rm /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf
```

6. Перезапустите dnsmasq:
```bash
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq
```

7. Проверьте что работает перевод домена Gemini API на IP адреса:
```bash
dig generativelanguage.googleapis.com
sudo ipset list gemini
```
В `ipset list gemini` длжны появиться IP адреса Google Gemini API.

8. Убедитесь, что ipset поддерживается в ip rule:
```bash
sudo modprobe ip_set
sudo modprobe ip_set_hash_ip
```
Проверим версию iproute2
```bash
ip -v
```
Нужна хотя бы версия 4.9+, чтобы поддерживался `match-set`.

9. Добавление правила fwmark:
```bash
# удалить все правила fwmark 1 → vpn (несколько попыток на всякий случай)
sudo ip rule del fwmark 1 lookup vpn 2>/dev/null || true
sudo ip rule del fwmark 0x1 lookup vpn 2>/dev/null || true

# добавим ровно одно правило
sudo ip rule add fwmark 1 lookup vpn
```
Проверка:
```bash
ip rule show
```
В выводе должно быть ровно одно правило вида `... fwmark 0x1 lookup vpn`.

10. Убедитесь, что таблица VPN содержит дефолт через `tun0`:
(если tun0 может иметь другое имя — замените)
```bash
# добавить таблицу если нужно
grep -q "^200 vpn" /etc/iproute2/rt_tables || echo "200 vpn" | sudo tee -a /etc/iproute2/rt_tables

# сброс и установка дефолта в таблице vpn
sudo ip route flush table vpn
sudo ip route add default dev tun0 table vpn

# проверить
ip route show table vpn
```
Должно быть `default dev tun0`.

11. Установим/проверим iptables mangle правило, которое помечает пакеты к IP из ipset gemini:
```bash
# удалить старое (если есть), потом добавить
sudo iptables -t mangle -D OUTPUT -m set --match-set gemini dst -j MARK --set-mark 1 2>/dev/null || true
sudo iptables -t mangle -A OUTPUT -m set --match-set gemini dst -j MARK --set-mark 1

# посмотреть правило и счётчики
sudo iptables -t mangle -L OUTPUT -vn --line-numbers
```

Проверка:
(IP замените на любой IP из `ipset list gemini`)
```bash
ip route get IP
ip route get IP mark 1
```
Вы должны увидеть что то типа:
```bash
ip route get IP
IP dev tun0 table 2022 src 172.19.0.1 uid 1000 
    cache 
ip route get IP mark 1
IP dev tun0 table vpn src 172.19.0.1 mark 1 uid 1000 
    cache
```
Как вы видите оба запроса идут через tun0 интерфейс, т. е. через VPN, но один запрос имеет `mark 1`, другой нет. Нас интересует запрос без `mark 1`, в нем вы видите `table 2022`, это значит что Hiddify создает таблицу `2022` через которую маршрутизирует через себя весь траффик, нам же нужно маршрутизировать только `mark 1` траффик.

Чтобы это реализовать выполните инструкцию "Постоянная настройка (выполняется после каждого перезапуска Hiddify Next при использовании VPN режима)".

### Постоянная настройка (выполняется после каждого перезапуска Hiddify Next при использовании VPN режима)
1. Очистка конфликтных правил:
(Обратите внимание на то что ваша таблица может иметь иное имя от 2022)
```bash
# удалить все ip rule, которые указывают lookup 2022
for p in $(ip rule show | awk -F: '/lookup 2022/ {print $1}'); do
  sudo ip rule del pref $p 2>/dev/null || true
done

# очистим таблицу 2022
sudo ip route flush table 2022 2>/dev/null || true
```

2. Настроим таблицу VPN и правило fwmark -> VPN:
```bash
# добавим таблицу vpn (если ещё нет)
grep -q "^200 vpn" /etc/iproute2/rt_tables || echo "200 vpn" | sudo tee -a /etc/iproute2/rt_tables

# назначим default через tun0 в таблице vpn
sudo ip route flush table vpn 2>/dev/null || true
sudo ip route add default dev tun0 table vpn

# удалим старые правила fwmark->vpn и добавим одно корректное
sudo ip rule del fwmark 1 lookup vpn 2>/dev/null || true
sudo ip rule add fwmark 1 lookup vpn

# сброс кеша
sudo ip route flush cache
```

3. Добавьте iptables-маркировку по ipset `gemini`:
```bash
# удалим старое правило (если есть), затем добавим нужное
sudo iptables -t mangle -D OUTPUT -m set --match-set gemini dst -j MARK --set-mark 1 2>/dev/null || true
sudo iptables -t mangle -A OUTPUT -m set --match-set gemini dst -j MARK --set-mark 1

# проверка
sudo iptables -t mangle -L OUTPUT -vn --line-numbers
```
Появится правило, счётчики будут увеличиваться, когда ты делаешь запросы к IP из `ipset gemini`.

4. Быстрая проверка:
(Замени IP любым из `ipset list gemini`)
```bash
IP=172.217.18.10   # пример — подставь любой из sudo ipset list gemini
ip route get $IP
ip route get $IP mark 1
# ожидаем: первая строка через wlp2s0, вторая — через tun0
```
Если вторая команда показывает dev tun0 — всё работает (только этот трафик будет идти через VPN).