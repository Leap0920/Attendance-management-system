const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('leapfrog', 10);
// bcryptjs generates $2b$ but Java BCrypt expects $2a$ - they are compatible
const javaHash = '$2a$' + hash.substring(4);
console.log(javaHash);
