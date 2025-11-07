# MongoDB Authentication Fix

## Issue
MongoDB is requiring authentication for operations (find, insert, etc.) even though you want it disabled.

## Solution Options

### Option 1: Disable Authentication on MongoDB Server (Recommended if you want no auth)

**On the MongoDB server (10.30.10.29):**

1. **Edit MongoDB configuration file:**
   - Linux: `/etc/mongod.conf`
   - Windows: `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`

2. **Remove or comment out the security section:**
   ```yaml
   # security:
   #   authorization: enabled
   ```
   Or ensure it's set to:
   ```yaml
   security:
     authorization: disabled
   ```

3. **Restart MongoDB:**
   ```bash
   # Linux
   sudo systemctl restart mongod
   
   # Windows
   Restart-Service MongoDB
   ```

### Option 2: Use Authentication (If you have credentials)

If you have MongoDB username and password, update the connection string in `config.env`:

```env
MONGODB_URI=mongodb://username:password@10.30.10.29:27017/queue_project
```

**Note:** If password contains special characters, URL-encode them:
- `@` becomes `%40`
- `:` becomes `%3A`
- `/` becomes `%2F`
- etc.

### Option 3: Create a User with Read/Write Access

If you want to keep authentication but create a user for your application:

1. **Connect to MongoDB on the server:**
   ```bash
   mongosh
   # or
   mongo
   ```

2. **Switch to your database:**
   ```javascript
   use queue_project
   ```

3. **Create a user with read/write access:**
   ```javascript
   db.createUser({
     user: "appuser",
     pwd: "yourpassword",
     roles: [
       { role: "readWrite", db: "queue_project" }
     ]
   })
   ```

4. **Update connection string:**
   ```env
   MONGODB_URI=mongodb://appuser:yourpassword@10.30.10.29:27017/queue_project
   ```

## Quick Test

After making changes, test the connection:
```bash
npm run test:connection
```

