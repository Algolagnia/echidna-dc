# Debian/Ubuntu kurulum

## 1. Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # v22.x doğrulaması
```

## 2. Sistem kullanıcısı

```bash
sudo adduser --system --no-create-home --group --shell /usr/sbin/nologin echidna
sudo mkdir -p /opt/echidna
sudo chown echidna:echidna /opt/echidna
```

## 3. Kod deploy

Geliştirme makinesinde:
```bash
npm ci
npm run build
tar czf echidna.tar.gz dist node_modules package.json
scp echidna.tar.gz user@server:/tmp/
```

Sunucuda:
```bash
sudo tar xzf /tmp/echidna.tar.gz -C /opt/echidna/
sudo cp .env.example /opt/echidna/.env
# .env'i edit et: tokens, ADMIN_CHAT_IDS
sudo chmod 600 /opt/echidna/.env
sudo chown -R echidna:echidna /opt/echidna
```

## 4. systemd unit

```bash
sudo cp deploy/echidna.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now echidna
sudo systemctl status echidna
journalctl -u echidna -f
```

## 5. Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

## 6. Hardening doğrulaması

```bash
systemd-analyze security echidna
# Hedef: exposure level ≤ 2.0 (OK / SAFE)
```

## 7. Network sızıntı testi

Lookup yapılırken başka bir terminalde:
```bash
sudo tcpdump -i any -nn 'not host discord.com and not host telegram.org and not port 53'
# çıktı boş olmalı
```

## 8. Disk yazımı kontrolü

```bash
sudo opensnoop-bpfcc -n node | grep -v ' R$'   # write açılışları
# proje dizininde write açılışı olmamalı
```

## 9. Token rotation

Discord hesabı banlandığında veya değiştiğinde:
```bash
sudo -u echidna nano /opt/echidna/.env   # DISCORD_TOKEN güncelle
sudo systemctl restart echidna
journalctl -u echidna -f
```
