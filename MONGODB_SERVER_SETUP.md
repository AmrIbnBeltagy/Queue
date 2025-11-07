# MongoDB Server Configuration for Remote Access

## Issue
`ECONNREFUSED` error means MongoDB is refusing connections. This typically happens when MongoDB is only listening on localhost (127.0.0.1) instead of all network interfaces.

## Solution: Configure MongoDB to Accept Remote Connections

### On Linux Server (10.30.10.29):

1. **Edit MongoDB configuration file:**
   ```bash
   sudo nano /etc/mongod.conf
   ```

2. **Find and update the `net` section:**
   ```yaml
   net:
     port: 27017
     bindIp: 0.0.0.0  # Change from 127.0.0.1 to 0.0.0.0 to accept all IPs
   ```

3. **If authentication is disabled, ensure:**
   ```yaml
   security:
     authorization: disabled  # or remove this section entirely
   ```

4. **Restart MongoDB service:**
   ```bash
   sudo systemctl restart mongod
   # or
   sudo service mongod restart
   ```

5. **Verify MongoDB is listening on all interfaces:**
   ```bash
   sudo netstat -tlnp | grep 27017
   # Should show: 0.0.0.0:27017 (not just 127.0.0.1:27017)
   ```

### On Windows Server (10.30.10.29):

1. **Edit MongoDB configuration file:**
   - Location: `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`
   - Or: `C:\ProgramData\MongoDB\mongod.cfg`

2. **Update the `net` section:**
   ```yaml
   net:
     port: 27017
     bindIp: 0.0.0.0  # Change from 127.0.0.1 to 0.0.0.0
   ```

3. **Restart MongoDB service:**
   ```powershell
   Restart-Service MongoDB
   # or from Services GUI: MongoDB -> Restart
   ```

4. **Verify MongoDB is listening:**
   ```powershell
   netstat -an | findstr 27017
   # Should show: 0.0.0.0:27017
   ```

### Firewall Configuration

**On Linux (iptables/firewalld):**
```bash
# For firewalld
sudo firewall-cmd --permanent --add-port=27017/tcp
sudo firewall-cmd --reload

# For ufw
sudo ufw allow 27017/tcp
```

**On Windows:**
```powershell
# Allow MongoDB port through Windows Firewall
New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -LocalPort 27017 -Protocol TCP -Action Allow
```

### Verify Connection

From your development machine, test the connection:
```powershell
# Test network connectivity
Test-NetConnection -ComputerName 10.30.10.29 -Port 27017

# Should show: TcpTestSucceeded : True
```

### Alternative: Start MongoDB with Command Line (Temporary)

If you can't edit config files, you can start MongoDB with:
```bash
mongod --bind_ip 0.0.0.0 --port 27017
```

## After Configuration

Once MongoDB is configured to accept remote connections:
1. Restart your Node.js application
2. The connection should succeed
3. You should see: "✅ MongoDB Connected: 10.30.10.29"

