import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const moduleSource = await readFile(
  new URL(
    '../android/src/main/java/com/rwfitble/RwfitBleModule.java',
    import.meta.url,
  ),
  'utf8',
);

test('Android getAlarm resolves an empty list when the SDK only reports success', () => {
  const getAlarm = moduleSource.match(
    /private void getAlarm\(final Reply result\)[\s\S]*?private void setAlarm/,
  )?.[0];

  assert.ok(getAlarm, 'getAlarm implementation is missing');
  assert.match(
    getAlarm,
    /onSuccess\(\)\s*\{[\s\S]*?put\("data", new ArrayList<>\(\)\);[\s\S]*?result\.success\(r\);[\s\S]*?dispose\(this\);/,
  );
});
