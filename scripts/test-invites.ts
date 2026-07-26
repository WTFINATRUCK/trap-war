import { parseRefPayload, attributeReferral, codeForUser, crewStats } from './bot/referrals.ts';
import { parseInviteOnlyPayload } from './bot/security.ts';

console.log('valid', parseRefPayload('ref_TRAP-12345'));
console.log('invalid bare', parseRefPayload('TRAP-12345'));
console.log('invalid junk', parseRefPayload('hack_me'));
console.log('self', attributeReferral(12345, 'TRAP-12345'));
const a = attributeReferral(888001, 'TRAP-12345', { firstName: 'A' });
console.log('first', a);
const b = attributeReferral(888001, 'TRAP-12345');
console.log('dup', b);
console.log('stats', crewStats(12345));
console.log('invite only ok', parseInviteOnlyPayload('ref_TRAP-99'));
console.log('invite only bad', parseInviteOnlyPayload('TRAP-99'));
