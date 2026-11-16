export const categories = ['Travel','Local conveyance','Meals','Accommodation','Client entertainment','Office supplies','Internet and phone','Other'] as const;
export type Category = typeof categories[number];
export const statuses = ['Draft','Submitted','Manager approved','Finance approved','Paid','Rejected','Returned for correction','Cancelled'] as const;
export type Status = typeof statuses[number];
export type Role = 'Employee' | 'Manager' | 'Finance';
export interface User {id: string; name: string; email: string; role: Role; department: string; grade: string; managerId?: string; secondaryManagerId?: string; salt: string; hash: string}
export interface ReceiptRef {id: string; hash: string; name: string; size: number}
export interface Line {id: string; date: string; category: Category; vendor: string; description: string; amount: number; tax?: number; payment: 'personal card'|'cash'|'UPI'; receipts: ReceiptRef[]; notes: string; attendees: string; kind: 'expense'|'mileage'|'perdiem'; quantity: number; rate: number; currency: string; foreignAmount: number; fxRate: number; decision?: 'approved'|'rejected'; decisionComment?: string}
export interface Claim {id: string; number: string; ownerId: string; submittedBy: string; title: string; department: string; grade: string; costCentre: string; tripStart: string; tripEnd: string; currency: string; status: Status; lines: Line[]; justification: string; policyVersion?: number; createdAt: string; submittedAt?: string; updatedAt: string; managerApprovals: string[]}
export interface Audit {id: string; claimId: string; actorId: string; actorName: string; role: Role; time: string; status: Status; comment: string}
export interface Rule {enabled: boolean; value: number; explanation: string}
export const ruleKeys = ['daily','claimCap','monthly','receiptAmount','receiptCategories','duplicate','late','future','trip','mileageDay','mileageRate','allowed','entertainment','weekend','tax'] as const;
export type RuleKey = typeof ruleKeys[number];
export interface Policy {version: number; createdAt: string; rules: Record<RuleKey, Rule>; dailyLimits: Record<Category,number>; monthlyLimits: Record<Category,number>; receiptCategories: Category[]; allowedDepartments: Record<string,Category[]>; allowedGrades: Record<string,Category[]>; holidays: string[]; mileageRate: number; perDiem: number; secondLevel: boolean; secondLevelThreshold: number; glCodes: Record<Category,string>}
export interface Finding {rule: RuleKey|'manualRate'|'validation'; severity: 'Block'|'Warn'|'Info'; lineId: string|null; message: string; fix: string}
export interface Batch {id: string; date: string; mode: string; reference: string; claimIds: string[]; total: number; createdBy: string; paidAt: string}
export interface Session {userId: string; createdAt: number; activityAt: number}
export interface Lock {failures: number; until: number}
export interface State {schemaVersion: 2; revision: number; users: User[]; claims: Claim[]; policies: Policy[]; batches: Batch[]; audit: Audit[]; counters: Record<string,number>; session: Session|null; locks: Record<string,Lock>; theme: 'light'|'dark'; createdAt: string; lastBackup: string|null; notificationsRead: Record<string,string>}
export interface Backup {format: 'ClaimEase'; version: 2; exportedAt: string; data: Omit<State,'session'|'locks'>; receipts: {id: string; data: string; hash: string}[]}