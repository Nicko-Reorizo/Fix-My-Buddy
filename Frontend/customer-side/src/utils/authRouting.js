export function authPaths(role = 'customer') {
  return role === 'mechanic'
    ? { signin: '/mechanic/signin', signup: '/mechanic/signup', forgot: '/mechanic/forgot-password', home: '/mechanic/jobs' }
    : { signin: '/signin', signup: '/signup', forgot: '/forgot-password', home: '/app' };
}
