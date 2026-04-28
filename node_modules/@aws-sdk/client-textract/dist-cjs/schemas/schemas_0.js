"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentMetadata$ = exports.DocumentLocation$ = exports.DocumentGroup$ = exports.Document$ = exports.DetectedSignature$ = exports.DetectDocumentTextResponse$ = exports.DetectDocumentTextRequest$ = exports.DeleteAdapterVersionResponse$ = exports.DeleteAdapterVersionRequest$ = exports.DeleteAdapterResponse$ = exports.DeleteAdapterRequest$ = exports.CreateAdapterVersionResponse$ = exports.CreateAdapterVersionRequest$ = exports.CreateAdapterResponse$ = exports.CreateAdapterRequest$ = exports.BoundingBox$ = exports.Block$ = exports.AnalyzeIDResponse$ = exports.AnalyzeIDRequest$ = exports.AnalyzeIDDetections$ = exports.AnalyzeExpenseResponse$ = exports.AnalyzeExpenseRequest$ = exports.AnalyzeDocumentResponse$ = exports.AnalyzeDocumentRequest$ = exports.AdapterVersionOverview$ = exports.AdapterVersionEvaluationMetric$ = exports.AdapterVersionDatasetConfig$ = exports.AdaptersConfig$ = exports.AdapterOverview$ = exports.Adapter$ = exports.errorTypeRegistries = exports.ValidationException$ = exports.UnsupportedDocumentException$ = exports.ThrottlingException$ = exports.ServiceQuotaExceededException$ = exports.ResourceNotFoundException$ = exports.ProvisionedThroughputExceededException$ = exports.LimitExceededException$ = exports.InvalidS3ObjectException$ = exports.InvalidParameterException$ = exports.InvalidKMSKeyException$ = exports.InvalidJobIdException$ = exports.InternalServerError$ = exports.IdempotentParameterMismatchException$ = exports.HumanLoopQuotaExceededException$ = exports.DocumentTooLargeException$ = exports.ConflictException$ = exports.BadDocumentException$ = exports.AccessDeniedException$ = exports.TextractServiceException$ = void 0;
exports.Relationship$ = exports.Query$ = exports.QueriesConfig$ = exports.Prediction$ = exports.Point$ = exports.PageClassification$ = exports.OutputConfig$ = exports.NotificationChannel$ = exports.NormalizedValue$ = exports.ListTagsForResourceResponse$ = exports.ListTagsForResourceRequest$ = exports.ListAdapterVersionsResponse$ = exports.ListAdapterVersionsRequest$ = exports.ListAdaptersResponse$ = exports.ListAdaptersRequest$ = exports.LineItemGroup$ = exports.LineItemFields$ = exports.LendingSummary$ = exports.LendingResult$ = exports.LendingField$ = exports.LendingDocument$ = exports.LendingDetection$ = exports.IdentityDocumentField$ = exports.IdentityDocument$ = exports.HumanLoopDataAttributes$ = exports.HumanLoopConfig$ = exports.HumanLoopActivationOutput$ = exports.GetLendingAnalysisSummaryResponse$ = exports.GetLendingAnalysisSummaryRequest$ = exports.GetLendingAnalysisResponse$ = exports.GetLendingAnalysisRequest$ = exports.GetExpenseAnalysisResponse$ = exports.GetExpenseAnalysisRequest$ = exports.GetDocumentTextDetectionResponse$ = exports.GetDocumentTextDetectionRequest$ = exports.GetDocumentAnalysisResponse$ = exports.GetDocumentAnalysisRequest$ = exports.GetAdapterVersionResponse$ = exports.GetAdapterVersionRequest$ = exports.GetAdapterResponse$ = exports.GetAdapterRequest$ = exports.Geometry$ = exports.Extraction$ = exports.ExpenseType$ = exports.ExpenseGroupProperty$ = exports.ExpenseField$ = exports.ExpenseDocument$ = exports.ExpenseDetection$ = exports.ExpenseCurrency$ = exports.EvaluationMetric$ = void 0;
exports.UpdateAdapter$ = exports.UntagResource$ = exports.TagResource$ = exports.StartLendingAnalysis$ = exports.StartExpenseAnalysis$ = exports.StartDocumentTextDetection$ = exports.StartDocumentAnalysis$ = exports.ListTagsForResource$ = exports.ListAdapterVersions$ = exports.ListAdapters$ = exports.GetLendingAnalysisSummary$ = exports.GetLendingAnalysis$ = exports.GetExpenseAnalysis$ = exports.GetDocumentTextDetection$ = exports.GetDocumentAnalysis$ = exports.GetAdapterVersion$ = exports.GetAdapter$ = exports.DetectDocumentText$ = exports.DeleteAdapterVersion$ = exports.DeleteAdapter$ = exports.CreateAdapterVersion$ = exports.CreateAdapter$ = exports.AnalyzeID$ = exports.AnalyzeExpense$ = exports.AnalyzeDocument$ = exports.Warning$ = exports.UpdateAdapterResponse$ = exports.UpdateAdapterRequest$ = exports.UntagResourceResponse$ = exports.UntagResourceRequest$ = exports.UndetectedSignature$ = exports.TagResourceResponse$ = exports.TagResourceRequest$ = exports.StartLendingAnalysisResponse$ = exports.StartLendingAnalysisRequest$ = exports.StartExpenseAnalysisResponse$ = exports.StartExpenseAnalysisRequest$ = exports.StartDocumentTextDetectionResponse$ = exports.StartDocumentTextDetectionRequest$ = exports.StartDocumentAnalysisResponse$ = exports.StartDocumentAnalysisRequest$ = exports.SplitDocument$ = exports.SignatureDetection$ = exports.S3Object$ = void 0;
const _A = "Adapter";
const _AC = "AdaptersConfig";
const _ACT = "AfterCreationTime";
const _AD = "AnalyzeDocument";
const _ADE = "AccessDeniedException";
const _ADMV = "AnalyzeDocumentModelVersion";
const _ADR = "AnalyzeDocumentRequest";
const _ADRn = "AnalyzeDocumentResponse";
const _AE = "AnalyzeExpense";
const _AEMV = "AnalyzeExpenseModelVersion";
const _AER = "AnalyzeExpenseRequest";
const _AERn = "AnalyzeExpenseResponse";
const _AI = "AdapterId";
const _AID = "AnalyzeID";
const _AIDD = "AnalyzeIDDetections";
const _AIDMV = "AnalyzeIDModelVersion";
const _AIDR = "AnalyzeIDRequest";
const _AIDRn = "AnalyzeIDResponse";
const _AL = "AdapterList";
const _ALMV = "AnalyzeLendingModelVersion";
const _AN = "AdapterName";
const _AO = "AdapterOverview";
const _AU = "AutoUpdate";
const _AV = "AdapterVersion";
const _AVDC = "AdapterVersionDatasetConfig";
const _AVEM = "AdapterVersionEvaluationMetric";
const _AVEMd = "AdapterVersionEvaluationMetrics";
const _AVL = "AdapterVersionList";
const _AVO = "AdapterVersionOverview";
const _AVd = "AdapterVersions";
const _Ad = "Adapters";
const _Al = "Alias";
const _B = "Baseline";
const _BB = "BoundingBox";
const _BCT = "BeforeCreationTime";
const _BDE = "BadDocumentException";
const _BL = "BlockList";
const _BT = "BlockType";
const _Bl = "Blocks";
const _Blo = "Block";
const _Bu = "Bucket";
const _By = "Bytes";
const _C = "Code";
const _CA = "CreateAdapter";
const _CAR = "CreateAdapterRequest";
const _CARr = "CreateAdapterResponse";
const _CAV = "CreateAdapterVersion";
const _CAVR = "CreateAdapterVersionRequest";
const _CAVRr = "CreateAdapterVersionResponse";
const _CC = "ContentClassifiers";
const _CE = "ConflictException";
const _CI = "ColumnIndex";
const _CRT = "ClientRequestToken";
const _CS = "ColumnSpan";
const _CT = "CreationTime";
const _Co = "Confidence";
const _Cu = "Currency";
const _D = "Document";
const _DA = "DataAttributes";
const _DAR = "DeleteAdapterRequest";
const _DARe = "DeleteAdapterResponse";
const _DAV = "DeleteAdapterVersion";
const _DAVR = "DeleteAdapterVersionRequest";
const _DAVRe = "DeleteAdapterVersionResponse";
const _DAe = "DeleteAdapter";
const _DC = "DatasetConfig";
const _DDT = "DetectDocumentText";
const _DDTMV = "DetectDocumentTextModelVersion";
const _DDTR = "DetectDocumentTextRequest";
const _DDTRe = "DetectDocumentTextResponse";
const _DG = "DocumentGroup";
const _DGL = "DocumentGroupList";
const _DGo = "DocumentGroups";
const _DI = "DocumentIndex";
const _DL = "DocumentLocation";
const _DM = "DocumentMetadata";
const _DP = "DocumentPages";
const _DS = "DetectedSignature";
const _DSL = "DetectedSignatureList";
const _DSe = "DetectedSignatures";
const _DTLE = "DocumentTooLargeException";
const _De = "Description";
const _E = "Extraction";
const _EC = "ExpenseCurrency";
const _ECr = "ErrorCode";
const _ED = "ExpenseDocuments";
const _EDL = "ExpenseDocumentList";
const _EDx = "ExpenseDetection";
const _EDxp = "ExpenseDocument";
const _EF = "ExpenseField";
const _EFL = "ExpenseFieldList";
const _EGP = "ExpenseGroupProperty";
const _EGPL = "ExpenseGroupPropertyList";
const _EI = "ExpenseIndex";
const _EL = "ExtractionList";
const _EM = "EvaluationMetric";
const _EMv = "EvaluationMetrics";
const _ET = "EntityTypes";
const _ETx = "ExpenseType";
const _Ex = "Extractions";
const _FDA = "FlowDefinitionArn";
const _FS = "F1Score";
const _FT = "FeatureTypes";
const _FTe = "FeatureType";
const _G = "Geometry";
const _GA = "GetAdapter";
const _GAR = "GetAdapterRequest";
const _GARe = "GetAdapterResponse";
const _GAV = "GetAdapterVersion";
const _GAVR = "GetAdapterVersionRequest";
const _GAVRe = "GetAdapterVersionResponse";
const _GDA = "GetDocumentAnalysis";
const _GDAR = "GetDocumentAnalysisRequest";
const _GDARe = "GetDocumentAnalysisResponse";
const _GDTD = "GetDocumentTextDetection";
const _GDTDR = "GetDocumentTextDetectionRequest";
const _GDTDRe = "GetDocumentTextDetectionResponse";
const _GEA = "GetExpenseAnalysis";
const _GEAR = "GetExpenseAnalysisRequest";
const _GEARe = "GetExpenseAnalysisResponse";
const _GLA = "GetLendingAnalysis";
const _GLAR = "GetLendingAnalysisRequest";
const _GLARe = "GetLendingAnalysisResponse";
const _GLAS = "GetLendingAnalysisSummary";
const _GLASR = "GetLendingAnalysisSummaryRequest";
const _GLASRe = "GetLendingAnalysisSummaryResponse";
const _GP = "GroupProperties";
const _H = "Height";
const _HLA = "HumanLoopArn";
const _HLACER = "HumanLoopActivationConditionsEvaluationResults";
const _HLAO = "HumanLoopActivationOutput";
const _HLAR = "HumanLoopActivationReasons";
const _HLC = "HumanLoopConfig";
const _HLDA = "HumanLoopDataAttributes";
const _HLN = "HumanLoopName";
const _HLQEE = "HumanLoopQuotaExceededException";
const _I = "Id";
const _ID = "IdentityDocuments";
const _IDF = "IdentityDocumentFields";
const _IDFL = "IdentityDocumentFieldList";
const _IDFd = "IdentityDocumentField";
const _IDL = "IdentityDocumentList";
const _IDd = "IdentityDocument";
const _IJIE = "InvalidJobIdException";
const _IKMSKE = "InvalidKMSKeyException";
const _IPE = "InvalidParameterException";
const _IPME = "IdempotentParameterMismatchException";
const _ISE = "InternalServerError";
const _ISOE = "InvalidS3ObjectException";
const _Id = "Ids";
const _In = "Index";
const _JI = "JobId";
const _JS = "JobStatus";
const _JT = "JobTag";
const _KD = "KeyDetection";
const _KMSKI = "KMSKeyId";
const _L = "Left";
const _LA = "ListAdapters";
const _LAR = "ListAdaptersRequest";
const _LARi = "ListAdaptersResponse";
const _LAV = "ListAdapterVersions";
const _LAVR = "ListAdapterVersionsRequest";
const _LAVRi = "ListAdapterVersionsResponse";
const _LD = "LabelDetection";
const _LDL = "LendingDetectionList";
const _LDe = "LendingDocument";
const _LDen = "LendingDetection";
const _LEE = "LimitExceededException";
const _LF = "LendingFields";
const _LFL = "LendingFieldList";
const _LFe = "LendingField";
const _LI = "LineItems";
const _LIEF = "LineItemExpenseFields";
const _LIF = "LineItemFields";
const _LIG = "LineItemGroups";
const _LIGI = "LineItemGroupIndex";
const _LIGL = "LineItemGroupList";
const _LIGi = "LineItemGroup";
const _LIL = "LineItemList";
const _LR = "LendingResult";
const _LRL = "LendingResultList";
const _LS = "LendingSummary";
const _LTFR = "ListTagsForResource";
const _LTFRR = "ListTagsForResourceRequest";
const _LTFRRi = "ListTagsForResourceResponse";
const _M = "Message";
const _MR = "MaxResults";
const _MSO = "ManifestS3Object";
const _N = "Name";
const _NC = "NotificationChannel";
const _NT = "NextToken";
const _NV = "NormalizedValue";
const _OC = "OutputConfig";
const _P = "Pages";
const _PC = "PageClassification";
const _PL = "PredictionList";
const _PN = "PageNumber";
const _PT = "PageType";
const _PTEE = "ProvisionedThroughputExceededException";
const _Pa = "Page";
const _Po = "Polygon";
const _Poi = "Point";
const _Pr = "Precision";
const _Pre = "Prediction";
const _Q = "Query";
const _QC = "QuotaCode";
const _QCu = "QueriesConfig";
const _Qu = "Queries";
const _R = "Relationships";
const _RA = "RotationAngle";
const _RARN = "ResourceARN";
const _RAo = "RoleArn";
const _RI = "RowIndex";
const _RL = "RelationshipList";
const _RNFE = "ResourceNotFoundException";
const _RS = "RowSpan";
const _RT = "ResourceType";
const _Re = "Recall";
const _Rel = "Relationship";
const _Res = "Results";
const _S = "Status";
const _SB = "S3Bucket";
const _SC = "ServiceCode";
const _SD = "SplitDocuments";
const _SDA = "StartDocumentAnalysis";
const _SDAR = "StartDocumentAnalysisRequest";
const _SDARt = "StartDocumentAnalysisResponse";
const _SDL = "SignatureDetectionList";
const _SDLp = "SplitDocumentList";
const _SDTD = "StartDocumentTextDetection";
const _SDTDR = "StartDocumentTextDetectionRequest";
const _SDTDRt = "StartDocumentTextDetectionResponse";
const _SDi = "SignatureDetections";
const _SDig = "SignatureDetection";
const _SDp = "SplitDocument";
const _SEA = "StartExpenseAnalysis";
const _SEAR = "StartExpenseAnalysisRequest";
const _SEARt = "StartExpenseAnalysisResponse";
const _SF = "SummaryFields";
const _SJHLACER = "SynthesizedJsonHumanLoopActivationConditionsEvaluationResults";
const _SLA = "StartLendingAnalysis";
const _SLAR = "StartLendingAnalysisRequest";
const _SLARt = "StartLendingAnalysisResponse";
const _SM = "StatusMessage";
const _SNSTA = "SNSTopicArn";
const _SO = "S3Object";
const _SP = "S3Prefix";
const _SQEE = "ServiceQuotaExceededException";
const _SS = "SelectionStatus";
const _Su = "Summary";
const _T = "Text";
const _TE = "ThrottlingException";
const _TK = "TagKeys";
const _TR = "TagResource";
const _TRR = "TagResourceRequest";
const _TRRa = "TagResourceResponse";
const _TT = "TextType";
const _Ta = "Tags";
const _To = "Top";
const _Ty = "Type";
const _Typ = "Types";
const _UA = "UpdateAdapter";
const _UAR = "UpdateAdapterRequest";
const _UARp = "UpdateAdapterResponse";
const _UDE = "UnsupportedDocumentException";
const _UDT = "UndetectedDocumentTypes";
const _UR = "UntagResource";
const _URR = "UntagResourceRequest";
const _URRn = "UntagResourceResponse";
const _US = "UndetectedSignatures";
const _USL = "UndetectedSignatureList";
const _USn = "UndetectedSignature";
const _V = "Version";
const _VD = "ValueDetection";
const _VDa = "ValueDetections";
const _VE = "ValidationException";
const _VT = "ValueType";
const _Va = "Value";
const _W = "Width";
const _Wa = "Warnings";
const _War = "Warning";
const _X = "X";
const _Y = "Y";
const _a = "application/json";
const _c = "client";
const _e = "error";
const _hE = "httpError";
const _mT = "mediaType";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.textract";
const _se = "server";
const n0 = "com.amazonaws.textract";
const schema_1 = require("@smithy/core/schema");
const errors_1 = require("../models/errors");
const TextractServiceException_1 = require("../models/TextractServiceException");
const _s_registry = schema_1.TypeRegistry.for(_s);
exports.TextractServiceException$ = [-3, _s, "TextractServiceException", 0, [], []];
_s_registry.registerError(exports.TextractServiceException$, TextractServiceException_1.TextractServiceException);
const n0_registry = schema_1.TypeRegistry.for(n0);
exports.AccessDeniedException$ = [-3, n0, _ADE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.AccessDeniedException$, errors_1.AccessDeniedException);
exports.BadDocumentException$ = [-3, n0, _BDE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.BadDocumentException$, errors_1.BadDocumentException);
exports.ConflictException$ = [-3, n0, _CE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ConflictException$, errors_1.ConflictException);
exports.DocumentTooLargeException$ = [-3, n0, _DTLE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.DocumentTooLargeException$, errors_1.DocumentTooLargeException);
exports.HumanLoopQuotaExceededException$ = [-3, n0, _HLQEE,
    { [_e]: _c, [_hE]: 402 },
    [_RT, _QC, _SC, _M, _C],
    [0, 0, 0, 0, 0]
];
n0_registry.registerError(exports.HumanLoopQuotaExceededException$, errors_1.HumanLoopQuotaExceededException);
exports.IdempotentParameterMismatchException$ = [-3, n0, _IPME,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.IdempotentParameterMismatchException$, errors_1.IdempotentParameterMismatchException);
exports.InternalServerError$ = [-3, n0, _ISE,
    { [_e]: _se },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.InternalServerError$, errors_1.InternalServerError);
exports.InvalidJobIdException$ = [-3, n0, _IJIE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.InvalidJobIdException$, errors_1.InvalidJobIdException);
exports.InvalidKMSKeyException$ = [-3, n0, _IKMSKE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.InvalidKMSKeyException$, errors_1.InvalidKMSKeyException);
exports.InvalidParameterException$ = [-3, n0, _IPE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.InvalidParameterException$, errors_1.InvalidParameterException);
exports.InvalidS3ObjectException$ = [-3, n0, _ISOE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.InvalidS3ObjectException$, errors_1.InvalidS3ObjectException);
exports.LimitExceededException$ = [-3, n0, _LEE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.LimitExceededException$, errors_1.LimitExceededException);
exports.ProvisionedThroughputExceededException$ = [-3, n0, _PTEE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ProvisionedThroughputExceededException$, errors_1.ProvisionedThroughputExceededException);
exports.ResourceNotFoundException$ = [-3, n0, _RNFE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ResourceNotFoundException$, errors_1.ResourceNotFoundException);
exports.ServiceQuotaExceededException$ = [-3, n0, _SQEE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ServiceQuotaExceededException$, errors_1.ServiceQuotaExceededException);
exports.ThrottlingException$ = [-3, n0, _TE,
    { [_e]: _se },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ThrottlingException$, errors_1.ThrottlingException);
exports.UnsupportedDocumentException$ = [-3, n0, _UDE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.UnsupportedDocumentException$, errors_1.UnsupportedDocumentException);
exports.ValidationException$ = [-3, n0, _VE,
    { [_e]: _c },
    [_M, _C],
    [0, 0]
];
n0_registry.registerError(exports.ValidationException$, errors_1.ValidationException);
exports.errorTypeRegistries = [
    _s_registry,
    n0_registry,
];
var SynthesizedJsonHumanLoopActivationConditionsEvaluationResults = [0, n0, _SJHLACER, { [_mT]: _a }, 0];
exports.Adapter$ = [3, n0, _A,
    0,
    [_AI, _V, _P],
    [0, 0, 64 | 0], 2
];
exports.AdapterOverview$ = [3, n0, _AO,
    0,
    [_AI, _AN, _CT, _FT],
    [0, 0, 4, 64 | 0]
];
exports.AdaptersConfig$ = [3, n0, _AC,
    0,
    [_Ad],
    [() => Adapters], 1
];
exports.AdapterVersionDatasetConfig$ = [3, n0, _AVDC,
    0,
    [_MSO],
    [() => exports.S3Object$]
];
exports.AdapterVersionEvaluationMetric$ = [3, n0, _AVEM,
    0,
    [_B, _AV, _FTe],
    [() => exports.EvaluationMetric$, () => exports.EvaluationMetric$, 0]
];
exports.AdapterVersionOverview$ = [3, n0, _AVO,
    0,
    [_AI, _AV, _CT, _FT, _S, _SM],
    [0, 0, 4, 64 | 0, 0, 0]
];
exports.AnalyzeDocumentRequest$ = [3, n0, _ADR,
    0,
    [_D, _FT, _HLC, _QCu, _AC],
    [() => exports.Document$, 64 | 0, () => exports.HumanLoopConfig$, () => exports.QueriesConfig$, () => exports.AdaptersConfig$], 2
];
exports.AnalyzeDocumentResponse$ = [3, n0, _ADRn,
    0,
    [_DM, _Bl, _HLAO, _ADMV],
    [() => exports.DocumentMetadata$, () => BlockList, [() => exports.HumanLoopActivationOutput$, 0], 0]
];
exports.AnalyzeExpenseRequest$ = [3, n0, _AER,
    0,
    [_D],
    [() => exports.Document$], 1
];
exports.AnalyzeExpenseResponse$ = [3, n0, _AERn,
    0,
    [_DM, _ED],
    [() => exports.DocumentMetadata$, () => ExpenseDocumentList]
];
exports.AnalyzeIDDetections$ = [3, n0, _AIDD,
    0,
    [_T, _NV, _Co],
    [0, () => exports.NormalizedValue$, 1], 1
];
exports.AnalyzeIDRequest$ = [3, n0, _AIDR,
    0,
    [_DP],
    [() => DocumentPages], 1
];
exports.AnalyzeIDResponse$ = [3, n0, _AIDRn,
    0,
    [_ID, _DM, _AIDMV],
    [() => IdentityDocumentList, () => exports.DocumentMetadata$, 0]
];
exports.Block$ = [3, n0, _Blo,
    0,
    [_BT, _Co, _T, _TT, _RI, _CI, _RS, _CS, _G, _I, _R, _ET, _SS, _Pa, _Q],
    [0, 1, 0, 0, 1, 1, 1, 1, () => exports.Geometry$, 0, () => RelationshipList, 64 | 0, 0, 1, () => exports.Query$]
];
exports.BoundingBox$ = [3, n0, _BB,
    0,
    [_W, _H, _L, _To],
    [1, 1, 1, 1]
];
exports.CreateAdapterRequest$ = [3, n0, _CAR,
    0,
    [_AN, _FT, _CRT, _De, _AU, _Ta],
    [0, 64 | 0, [0, 4], 0, 0, 128 | 0], 2
];
exports.CreateAdapterResponse$ = [3, n0, _CARr,
    0,
    [_AI],
    [0]
];
exports.CreateAdapterVersionRequest$ = [3, n0, _CAVR,
    0,
    [_AI, _DC, _OC, _CRT, _KMSKI, _Ta],
    [0, () => exports.AdapterVersionDatasetConfig$, () => exports.OutputConfig$, [0, 4], 0, 128 | 0], 3
];
exports.CreateAdapterVersionResponse$ = [3, n0, _CAVRr,
    0,
    [_AI, _AV],
    [0, 0]
];
exports.DeleteAdapterRequest$ = [3, n0, _DAR,
    0,
    [_AI],
    [0], 1
];
exports.DeleteAdapterResponse$ = [3, n0, _DARe,
    0,
    [],
    []
];
exports.DeleteAdapterVersionRequest$ = [3, n0, _DAVR,
    0,
    [_AI, _AV],
    [0, 0], 2
];
exports.DeleteAdapterVersionResponse$ = [3, n0, _DAVRe,
    0,
    [],
    []
];
exports.DetectDocumentTextRequest$ = [3, n0, _DDTR,
    0,
    [_D],
    [() => exports.Document$], 1
];
exports.DetectDocumentTextResponse$ = [3, n0, _DDTRe,
    0,
    [_DM, _Bl, _DDTMV],
    [() => exports.DocumentMetadata$, () => BlockList, 0]
];
exports.DetectedSignature$ = [3, n0, _DS,
    0,
    [_Pa],
    [1]
];
exports.Document$ = [3, n0, _D,
    0,
    [_By, _SO],
    [21, () => exports.S3Object$]
];
exports.DocumentGroup$ = [3, n0, _DG,
    0,
    [_Ty, _SD, _DSe, _US],
    [0, () => SplitDocumentList, () => DetectedSignatureList, () => UndetectedSignatureList]
];
exports.DocumentLocation$ = [3, n0, _DL,
    0,
    [_SO],
    [() => exports.S3Object$]
];
exports.DocumentMetadata$ = [3, n0, _DM,
    0,
    [_P],
    [1]
];
exports.EvaluationMetric$ = [3, n0, _EM,
    0,
    [_FS, _Pr, _Re],
    [1, 1, 1]
];
exports.ExpenseCurrency$ = [3, n0, _EC,
    0,
    [_C, _Co],
    [0, 1]
];
exports.ExpenseDetection$ = [3, n0, _EDx,
    0,
    [_T, _G, _Co],
    [0, () => exports.Geometry$, 1]
];
exports.ExpenseDocument$ = [3, n0, _EDxp,
    0,
    [_EI, _SF, _LIG, _Bl],
    [1, () => ExpenseFieldList, () => LineItemGroupList, () => BlockList]
];
exports.ExpenseField$ = [3, n0, _EF,
    0,
    [_Ty, _LD, _VD, _PN, _Cu, _GP],
    [() => exports.ExpenseType$, () => exports.ExpenseDetection$, () => exports.ExpenseDetection$, 1, () => exports.ExpenseCurrency$, () => ExpenseGroupPropertyList]
];
exports.ExpenseGroupProperty$ = [3, n0, _EGP,
    0,
    [_Typ, _I],
    [64 | 0, 0]
];
exports.ExpenseType$ = [3, n0, _ETx,
    0,
    [_T, _Co],
    [0, 1]
];
exports.Extraction$ = [3, n0, _E,
    0,
    [_LDe, _EDxp, _IDd],
    [() => exports.LendingDocument$, () => exports.ExpenseDocument$, () => exports.IdentityDocument$]
];
exports.Geometry$ = [3, n0, _G,
    0,
    [_BB, _Po, _RA],
    [() => exports.BoundingBox$, () => Polygon, 1]
];
exports.GetAdapterRequest$ = [3, n0, _GAR,
    0,
    [_AI],
    [0], 1
];
exports.GetAdapterResponse$ = [3, n0, _GARe,
    0,
    [_AI, _AN, _CT, _De, _FT, _AU, _Ta],
    [0, 0, 4, 0, 64 | 0, 0, 128 | 0]
];
exports.GetAdapterVersionRequest$ = [3, n0, _GAVR,
    0,
    [_AI, _AV],
    [0, 0], 2
];
exports.GetAdapterVersionResponse$ = [3, n0, _GAVRe,
    0,
    [_AI, _AV, _CT, _FT, _S, _SM, _DC, _KMSKI, _OC, _EMv, _Ta],
    [0, 0, 4, 64 | 0, 0, 0, () => exports.AdapterVersionDatasetConfig$, 0, () => exports.OutputConfig$, () => AdapterVersionEvaluationMetrics, 128 | 0]
];
exports.GetDocumentAnalysisRequest$ = [3, n0, _GDAR,
    0,
    [_JI, _MR, _NT],
    [0, 1, 0], 1
];
exports.GetDocumentAnalysisResponse$ = [3, n0, _GDARe,
    0,
    [_DM, _JS, _NT, _Bl, _Wa, _SM, _ADMV],
    [() => exports.DocumentMetadata$, 0, 0, () => BlockList, () => Warnings, 0, 0]
];
exports.GetDocumentTextDetectionRequest$ = [3, n0, _GDTDR,
    0,
    [_JI, _MR, _NT],
    [0, 1, 0], 1
];
exports.GetDocumentTextDetectionResponse$ = [3, n0, _GDTDRe,
    0,
    [_DM, _JS, _NT, _Bl, _Wa, _SM, _DDTMV],
    [() => exports.DocumentMetadata$, 0, 0, () => BlockList, () => Warnings, 0, 0]
];
exports.GetExpenseAnalysisRequest$ = [3, n0, _GEAR,
    0,
    [_JI, _MR, _NT],
    [0, 1, 0], 1
];
exports.GetExpenseAnalysisResponse$ = [3, n0, _GEARe,
    0,
    [_DM, _JS, _NT, _ED, _Wa, _SM, _AEMV],
    [() => exports.DocumentMetadata$, 0, 0, () => ExpenseDocumentList, () => Warnings, 0, 0]
];
exports.GetLendingAnalysisRequest$ = [3, n0, _GLAR,
    0,
    [_JI, _MR, _NT],
    [0, 1, 0], 1
];
exports.GetLendingAnalysisResponse$ = [3, n0, _GLARe,
    0,
    [_DM, _JS, _NT, _Res, _Wa, _SM, _ALMV],
    [() => exports.DocumentMetadata$, 0, 0, () => LendingResultList, () => Warnings, 0, 0]
];
exports.GetLendingAnalysisSummaryRequest$ = [3, n0, _GLASR,
    0,
    [_JI],
    [0], 1
];
exports.GetLendingAnalysisSummaryResponse$ = [3, n0, _GLASRe,
    0,
    [_DM, _JS, _Su, _Wa, _SM, _ALMV],
    [() => exports.DocumentMetadata$, 0, () => exports.LendingSummary$, () => Warnings, 0, 0]
];
exports.HumanLoopActivationOutput$ = [3, n0, _HLAO,
    0,
    [_HLA, _HLAR, _HLACER],
    [0, 64 | 0, [() => SynthesizedJsonHumanLoopActivationConditionsEvaluationResults, 0]]
];
exports.HumanLoopConfig$ = [3, n0, _HLC,
    0,
    [_HLN, _FDA, _DA],
    [0, 0, () => exports.HumanLoopDataAttributes$], 2
];
exports.HumanLoopDataAttributes$ = [3, n0, _HLDA,
    0,
    [_CC],
    [64 | 0]
];
exports.IdentityDocument$ = [3, n0, _IDd,
    0,
    [_DI, _IDF, _Bl],
    [1, () => IdentityDocumentFieldList, () => BlockList]
];
exports.IdentityDocumentField$ = [3, n0, _IDFd,
    0,
    [_Ty, _VD],
    [() => exports.AnalyzeIDDetections$, () => exports.AnalyzeIDDetections$]
];
exports.LendingDetection$ = [3, n0, _LDen,
    0,
    [_T, _SS, _G, _Co],
    [0, 0, () => exports.Geometry$, 1]
];
exports.LendingDocument$ = [3, n0, _LDe,
    0,
    [_LF, _SDi],
    [() => LendingFieldList, () => SignatureDetectionList]
];
exports.LendingField$ = [3, n0, _LFe,
    0,
    [_Ty, _KD, _VDa],
    [0, () => exports.LendingDetection$, () => LendingDetectionList]
];
exports.LendingResult$ = [3, n0, _LR,
    0,
    [_Pa, _PC, _Ex],
    [1, () => exports.PageClassification$, () => ExtractionList]
];
exports.LendingSummary$ = [3, n0, _LS,
    0,
    [_DGo, _UDT],
    [() => DocumentGroupList, 64 | 0]
];
exports.LineItemFields$ = [3, n0, _LIF,
    0,
    [_LIEF],
    [() => ExpenseFieldList]
];
exports.LineItemGroup$ = [3, n0, _LIGi,
    0,
    [_LIGI, _LI],
    [1, () => LineItemList]
];
exports.ListAdaptersRequest$ = [3, n0, _LAR,
    0,
    [_ACT, _BCT, _MR, _NT],
    [4, 4, 1, 0]
];
exports.ListAdaptersResponse$ = [3, n0, _LARi,
    0,
    [_Ad, _NT],
    [() => AdapterList, 0]
];
exports.ListAdapterVersionsRequest$ = [3, n0, _LAVR,
    0,
    [_AI, _ACT, _BCT, _MR, _NT],
    [0, 4, 4, 1, 0]
];
exports.ListAdapterVersionsResponse$ = [3, n0, _LAVRi,
    0,
    [_AVd, _NT],
    [() => AdapterVersionList, 0]
];
exports.ListTagsForResourceRequest$ = [3, n0, _LTFRR,
    0,
    [_RARN],
    [0], 1
];
exports.ListTagsForResourceResponse$ = [3, n0, _LTFRRi,
    0,
    [_Ta],
    [128 | 0]
];
exports.NormalizedValue$ = [3, n0, _NV,
    0,
    [_Va, _VT],
    [0, 0]
];
exports.NotificationChannel$ = [3, n0, _NC,
    0,
    [_SNSTA, _RAo],
    [0, 0], 2
];
exports.OutputConfig$ = [3, n0, _OC,
    0,
    [_SB, _SP],
    [0, 0], 1
];
exports.PageClassification$ = [3, n0, _PC,
    0,
    [_PT, _PN],
    [() => PredictionList, () => PredictionList], 2
];
exports.Point$ = [3, n0, _Poi,
    0,
    [_X, _Y],
    [1, 1]
];
exports.Prediction$ = [3, n0, _Pre,
    0,
    [_Va, _Co],
    [0, 1]
];
exports.QueriesConfig$ = [3, n0, _QCu,
    0,
    [_Qu],
    [() => Queries], 1
];
exports.Query$ = [3, n0, _Q,
    0,
    [_T, _Al, _P],
    [0, 0, 64 | 0], 1
];
exports.Relationship$ = [3, n0, _Rel,
    0,
    [_Ty, _Id],
    [0, 64 | 0]
];
exports.S3Object$ = [3, n0, _SO,
    0,
    [_Bu, _N, _V],
    [0, 0, 0]
];
exports.SignatureDetection$ = [3, n0, _SDig,
    0,
    [_Co, _G],
    [1, () => exports.Geometry$]
];
exports.SplitDocument$ = [3, n0, _SDp,
    0,
    [_In, _P],
    [1, 64 | 1]
];
exports.StartDocumentAnalysisRequest$ = [3, n0, _SDAR,
    0,
    [_DL, _FT, _CRT, _JT, _NC, _OC, _KMSKI, _QCu, _AC],
    [() => exports.DocumentLocation$, 64 | 0, 0, 0, () => exports.NotificationChannel$, () => exports.OutputConfig$, 0, () => exports.QueriesConfig$, () => exports.AdaptersConfig$], 2
];
exports.StartDocumentAnalysisResponse$ = [3, n0, _SDARt,
    0,
    [_JI],
    [0]
];
exports.StartDocumentTextDetectionRequest$ = [3, n0, _SDTDR,
    0,
    [_DL, _CRT, _JT, _NC, _OC, _KMSKI],
    [() => exports.DocumentLocation$, 0, 0, () => exports.NotificationChannel$, () => exports.OutputConfig$, 0], 1
];
exports.StartDocumentTextDetectionResponse$ = [3, n0, _SDTDRt,
    0,
    [_JI],
    [0]
];
exports.StartExpenseAnalysisRequest$ = [3, n0, _SEAR,
    0,
    [_DL, _CRT, _JT, _NC, _OC, _KMSKI],
    [() => exports.DocumentLocation$, 0, 0, () => exports.NotificationChannel$, () => exports.OutputConfig$, 0], 1
];
exports.StartExpenseAnalysisResponse$ = [3, n0, _SEARt,
    0,
    [_JI],
    [0]
];
exports.StartLendingAnalysisRequest$ = [3, n0, _SLAR,
    0,
    [_DL, _CRT, _JT, _NC, _OC, _KMSKI],
    [() => exports.DocumentLocation$, 0, 0, () => exports.NotificationChannel$, () => exports.OutputConfig$, 0], 1
];
exports.StartLendingAnalysisResponse$ = [3, n0, _SLARt,
    0,
    [_JI],
    [0]
];
exports.TagResourceRequest$ = [3, n0, _TRR,
    0,
    [_RARN, _Ta],
    [0, 128 | 0], 2
];
exports.TagResourceResponse$ = [3, n0, _TRRa,
    0,
    [],
    []
];
exports.UndetectedSignature$ = [3, n0, _USn,
    0,
    [_Pa],
    [1]
];
exports.UntagResourceRequest$ = [3, n0, _URR,
    0,
    [_RARN, _TK],
    [0, 64 | 0], 2
];
exports.UntagResourceResponse$ = [3, n0, _URRn,
    0,
    [],
    []
];
exports.UpdateAdapterRequest$ = [3, n0, _UAR,
    0,
    [_AI, _De, _AN, _AU],
    [0, 0, 0, 0], 1
];
exports.UpdateAdapterResponse$ = [3, n0, _UARp,
    0,
    [_AI, _AN, _CT, _De, _FT, _AU],
    [0, 0, 4, 0, 64 | 0, 0]
];
exports.Warning$ = [3, n0, _War,
    0,
    [_ECr, _P],
    [0, 64 | 1]
];
var AdapterList = [1, n0, _AL,
    0, () => exports.AdapterOverview$
];
var AdapterPages = 64 | 0;
var Adapters = [1, n0, _Ad,
    0, () => exports.Adapter$
];
var AdapterVersionEvaluationMetrics = [1, n0, _AVEMd,
    0, () => exports.AdapterVersionEvaluationMetric$
];
var AdapterVersionList = [1, n0, _AVL,
    0, () => exports.AdapterVersionOverview$
];
var BlockList = [1, n0, _BL,
    0, () => exports.Block$
];
var ContentClassifiers = 64 | 0;
var DetectedSignatureList = [1, n0, _DSL,
    0, () => exports.DetectedSignature$
];
var DocumentGroupList = [1, n0, _DGL,
    0, () => exports.DocumentGroup$
];
var DocumentPages = [1, n0, _DP,
    0, () => exports.Document$
];
var EntityTypes = 64 | 0;
var ExpenseDocumentList = [1, n0, _EDL,
    0, () => exports.ExpenseDocument$
];
var ExpenseFieldList = [1, n0, _EFL,
    0, () => exports.ExpenseField$
];
var ExpenseGroupPropertyList = [1, n0, _EGPL,
    0, () => exports.ExpenseGroupProperty$
];
var ExtractionList = [1, n0, _EL,
    0, () => exports.Extraction$
];
var FeatureTypes = 64 | 0;
var HumanLoopActivationReasons = 64 | 0;
var IdentityDocumentFieldList = [1, n0, _IDFL,
    0, () => exports.IdentityDocumentField$
];
var IdentityDocumentList = [1, n0, _IDL,
    0, () => exports.IdentityDocument$
];
var IdList = 64 | 0;
var LendingDetectionList = [1, n0, _LDL,
    0, () => exports.LendingDetection$
];
var LendingFieldList = [1, n0, _LFL,
    0, () => exports.LendingField$
];
var LendingResultList = [1, n0, _LRL,
    0, () => exports.LendingResult$
];
var LineItemGroupList = [1, n0, _LIGL,
    0, () => exports.LineItemGroup$
];
var LineItemList = [1, n0, _LIL,
    0, () => exports.LineItemFields$
];
var PageList = 64 | 1;
var Pages = 64 | 1;
var Polygon = [1, n0, _Po,
    0, () => exports.Point$
];
var PredictionList = [1, n0, _PL,
    0, () => exports.Prediction$
];
var Queries = [1, n0, _Qu,
    0, () => exports.Query$
];
var QueryPages = 64 | 0;
var RelationshipList = [1, n0, _RL,
    0, () => exports.Relationship$
];
var SignatureDetectionList = [1, n0, _SDL,
    0, () => exports.SignatureDetection$
];
var SplitDocumentList = [1, n0, _SDLp,
    0, () => exports.SplitDocument$
];
var StringList = 64 | 0;
var TagKeyList = 64 | 0;
var UndetectedDocumentTypeList = 64 | 0;
var UndetectedSignatureList = [1, n0, _USL,
    0, () => exports.UndetectedSignature$
];
var Warnings = [1, n0, _Wa,
    0, () => exports.Warning$
];
var TagMap = 128 | 0;
exports.AnalyzeDocument$ = [9, n0, _AD,
    0, () => exports.AnalyzeDocumentRequest$, () => exports.AnalyzeDocumentResponse$
];
exports.AnalyzeExpense$ = [9, n0, _AE,
    0, () => exports.AnalyzeExpenseRequest$, () => exports.AnalyzeExpenseResponse$
];
exports.AnalyzeID$ = [9, n0, _AID,
    0, () => exports.AnalyzeIDRequest$, () => exports.AnalyzeIDResponse$
];
exports.CreateAdapter$ = [9, n0, _CA,
    2, () => exports.CreateAdapterRequest$, () => exports.CreateAdapterResponse$
];
exports.CreateAdapterVersion$ = [9, n0, _CAV,
    2, () => exports.CreateAdapterVersionRequest$, () => exports.CreateAdapterVersionResponse$
];
exports.DeleteAdapter$ = [9, n0, _DAe,
    2, () => exports.DeleteAdapterRequest$, () => exports.DeleteAdapterResponse$
];
exports.DeleteAdapterVersion$ = [9, n0, _DAV,
    2, () => exports.DeleteAdapterVersionRequest$, () => exports.DeleteAdapterVersionResponse$
];
exports.DetectDocumentText$ = [9, n0, _DDT,
    0, () => exports.DetectDocumentTextRequest$, () => exports.DetectDocumentTextResponse$
];
exports.GetAdapter$ = [9, n0, _GA,
    0, () => exports.GetAdapterRequest$, () => exports.GetAdapterResponse$
];
exports.GetAdapterVersion$ = [9, n0, _GAV,
    0, () => exports.GetAdapterVersionRequest$, () => exports.GetAdapterVersionResponse$
];
exports.GetDocumentAnalysis$ = [9, n0, _GDA,
    0, () => exports.GetDocumentAnalysisRequest$, () => exports.GetDocumentAnalysisResponse$
];
exports.GetDocumentTextDetection$ = [9, n0, _GDTD,
    0, () => exports.GetDocumentTextDetectionRequest$, () => exports.GetDocumentTextDetectionResponse$
];
exports.GetExpenseAnalysis$ = [9, n0, _GEA,
    0, () => exports.GetExpenseAnalysisRequest$, () => exports.GetExpenseAnalysisResponse$
];
exports.GetLendingAnalysis$ = [9, n0, _GLA,
    0, () => exports.GetLendingAnalysisRequest$, () => exports.GetLendingAnalysisResponse$
];
exports.GetLendingAnalysisSummary$ = [9, n0, _GLAS,
    0, () => exports.GetLendingAnalysisSummaryRequest$, () => exports.GetLendingAnalysisSummaryResponse$
];
exports.ListAdapters$ = [9, n0, _LA,
    0, () => exports.ListAdaptersRequest$, () => exports.ListAdaptersResponse$
];
exports.ListAdapterVersions$ = [9, n0, _LAV,
    0, () => exports.ListAdapterVersionsRequest$, () => exports.ListAdapterVersionsResponse$
];
exports.ListTagsForResource$ = [9, n0, _LTFR,
    0, () => exports.ListTagsForResourceRequest$, () => exports.ListTagsForResourceResponse$
];
exports.StartDocumentAnalysis$ = [9, n0, _SDA,
    0, () => exports.StartDocumentAnalysisRequest$, () => exports.StartDocumentAnalysisResponse$
];
exports.StartDocumentTextDetection$ = [9, n0, _SDTD,
    0, () => exports.StartDocumentTextDetectionRequest$, () => exports.StartDocumentTextDetectionResponse$
];
exports.StartExpenseAnalysis$ = [9, n0, _SEA,
    0, () => exports.StartExpenseAnalysisRequest$, () => exports.StartExpenseAnalysisResponse$
];
exports.StartLendingAnalysis$ = [9, n0, _SLA,
    0, () => exports.StartLendingAnalysisRequest$, () => exports.StartLendingAnalysisResponse$
];
exports.TagResource$ = [9, n0, _TR,
    0, () => exports.TagResourceRequest$, () => exports.TagResourceResponse$
];
exports.UntagResource$ = [9, n0, _UR,
    0, () => exports.UntagResourceRequest$, () => exports.UntagResourceResponse$
];
exports.UpdateAdapter$ = [9, n0, _UA,
    0, () => exports.UpdateAdapterRequest$, () => exports.UpdateAdapterResponse$
];
