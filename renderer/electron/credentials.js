const Store = require('electron-store');
const keytar = require('keytar');
const crypto = require('crypto');

const store = new Store({ name: 'crew-tool' });
const SERVICE = 'hotel-crew-tool-opera';

function getAccounts() {
  return store.get('accounts', []); // [{ id, label, username }]
}

function saveAccount({ label, username, password }) {
  const accounts = getAccounts();
  const id = crypto.randomUUID();

  const newAcc = { id, label, username };
  store.set('accounts', [...accounts, newAcc]);

  return keytar.setPassword(SERVICE, id, password).then(() => newAcc);
}

async function updateAccountPassword(id, password) {
  await keytar.setPassword(SERVICE, id, password);
}

async function getPassword(id) {
  return keytar.getPassword(SERVICE, id);
}

async function deleteAccount(id) {
  const accounts = getAccounts().filter((a) => a.id !== id);
  store.set('accounts', accounts);
  await keytar.deletePassword(SERVICE, id);
}

module.exports = {
  getAccounts,
  saveAccount,
  updateAccountPassword,
  getPassword,
  deleteAccount,
};
