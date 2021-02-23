import React, { useState, useEffect } from 'react';
import { Alert, Button as BSButton, Col, Nav } from 'react-bootstrap';
import MaterialTable, { Column } from 'material-table';
import { ChevronRight } from '@material-ui/icons';
import { ProblemObject, CourseObject, StudentGrade } from '../CourseInterfaces';
import ProblemIframe from '../../Assignments/ProblemIframe';
import _ from 'lodash';
import AxiosRequest from '../../Hooks/AxiosRequest';
import * as qs from 'querystring';
import { UserRole, getUserRole } from '../../Enums/UserRole';
import moment from 'moment';
import { BsLock, BsPencilSquare, BsUnlock } from 'react-icons/bs';
import { OverrideGradeModal } from './OverrideGradeModal';
import { ConfirmationModal } from '../../Components/ConfirmationModal';
import { IAlertModalState, useMUIAlertState } from '../../Hooks/useAlertState';
import { putQuestionGrade } from '../../APIInterfaces/BackendAPI/Requests/CourseRequests';
import { EnumDictionary } from '../../Utilities/TypescriptUtils';
import logger from '../../Utilities/Logger';
import { CircularProgress, Chip, Grid, Tooltip, TablePagination } from '@material-ui/core';
import { Alert as MUIAlert } from '@material-ui/lab';
import MaterialIcons from '../../Components/MaterialIcons';
import { STATISTICS_SIMPLIFIED_HEADERS, STUDENT_STATISTICS_SIMPLIFIED_HEADERS, STUDENT_STATISTICS_SIMPLIFIED_TOPIC_HEADERS, STUDENT_STATISTICS_SIMPLIFIED_PROBLEM_HEADERS, STUDENT_STATISTICS_ATTEMPTS_HEADERS } from './TableColumnHeaders';

const FILTERED_STRING = '_FILTERED';

interface StatisticsTabProps {
    course: CourseObject;
    userId?: number;
}

enum StatisticsView {
    UNITS = 'UNITS',
    TOPICS = 'TOPICS',
    PROBLEMS = 'PROBLEMS',
    ATTEMPTS = 'ATTEMPTS',
}

enum StatisticsViewFilter {
    UNITS_FILTERED = 'UNITS_FILTERED',
    TOPICS_FILTERED = 'TOPICS_FILTERED',
    PROBLEMS_FILTERED = 'PROBLEMS_FILTERED',
    ATTEMPTS_FILTERED = 'ATTEMPTS_FILTERED',
}

type StatisticsViewAll = StatisticsView | StatisticsViewFilter;

const statisticsViewFromAllStatisticsViewFilter = (view: StatisticsViewAll): StatisticsView => {
    if (view.endsWith('_FILTERED')) {
        return view.slice(0, view.length - FILTERED_STRING.length) as StatisticsView;
    }
    return view as StatisticsView;
};

interface BreadCrumbFilter {
    id: number;
    displayName: string;
}

type BreadCrumbFilters = EnumDictionary<StatisticsView, BreadCrumbFilter>;

enum GradesStateView {
    LOCK='LOCK',
    OVERRIDE='OVERRIDE',
    NONE='NONE'
}

interface GradesState {
    view: GradesStateView;
    lockAlert: IAlertModalState | null;
    rowData?: any
}

const defaultGradesState: GradesState = {
    view: GradesStateView.NONE,
    lockAlert: null,
    rowData: undefined
};

// TitleData can be either the averages for all returned data, or the effective grade for
// a specific problem.
type TitleData = {
    totalAverage: number;
    totalOpenAverage: number;
    totalDeadAverage: number;
} | { 
    effectiveScore: number;
    systemScore: number;
    bestScore: number;
}

/**
 * When a professor wishes to see a student's view, they pass in the student's userId.
 * When they wish to see overall course statistics, they do not pass any userId.
 */
export const StatisticsTab: React.FC<StatisticsTabProps> = ({ course, userId }) => {
    const [view, setView] = useState<StatisticsViewAll>(StatisticsView.UNITS);
    const [idFilter, setIdFilter] = useState<number | null>(null);
    const [breadcrumbFilter, setBreadcrumbFilters] = useState<BreadCrumbFilters>({});
    const [rowData, setRowData] = useState<Array<any>>([]);
    const [gradesState, setGradesState] = useState<GradesState>(defaultGradesState);
    const [grade, setGrade] = useState<StudentGrade | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [statisticsAlert, setStatisticsAlert] = useMUIAlertState();
    const [titleGrade, setTitleGrade] = useState<TitleData | null>(null);
    const userType: UserRole = getUserRole();

    const globalView = statisticsViewFromAllStatisticsViewFilter(view);

    useEffect(() => {
        logger.debug(`Stats tab: [useEffect] course.id ${course.id}, globalView ${globalView}, idFilter ${idFilter}, userId ${userId}, userType ${userType}`);
        if (_.isNil(course)) return;

        setStatisticsAlert(state => ({...state, message: ''}));

        let url = '/courses/statistics';
        let filterParam: string = '';
        let idFilterLocal = idFilter;

        switch (view) {
        case StatisticsView.UNITS:
            url = `${url}/units?`;
            filterParam = '';
            if (idFilterLocal !== null) {
                logger.error('This should be null for units');
                idFilterLocal = null;
            }
            break;
        case StatisticsViewFilter.UNITS_FILTERED:
        case StatisticsView.TOPICS:
            url = `${url}/topics?`;
            filterParam = 'courseUnitContentId';
            break;
        case StatisticsViewFilter.TOPICS_FILTERED:
        case StatisticsView.PROBLEMS:
            url = `${url}/questions?`;
            filterParam = 'courseTopicContentId';
            break;
        case StatisticsViewFilter.PROBLEMS_FILTERED:
        case StatisticsView.ATTEMPTS:
            url = `/users/${userId}?includeGrades=WITH_ATTEMPTS&`;
            // TODO: RED-345 This should be removed when a similar call as the others is supported.
            idFilterLocal = null;
            break;
        default:
            logger.error('You should not have a view that is not the views or filtered views');
            break;
        }

        const queryString = qs.stringify(_({
            courseId: course.id,
            [filterParam]: idFilterLocal,
            userId: (view !== StatisticsView.ATTEMPTS && view !== StatisticsViewFilter.PROBLEMS_FILTERED) ? userId : null,
        }).omitBy(_.isNil).value() as any).toString();

        url = `${url}${queryString}`;

        (async () => {
            try {
                const res = await AxiosRequest.get(url);
                let data = res.data.data;

                const formatNumberString = (val: string, percentage: boolean = false) => {
                    if (_.isNil(val)) return '--';
                    if (percentage) return parseFloat(val).toPercentString();

                    return parseFloat(val).toFixed(2);
                };

                if (view === StatisticsView.ATTEMPTS || view === StatisticsViewFilter.PROBLEMS_FILTERED) {
                    const grades = data.grades.filter((grade: any) => {
                        const hasAttempts = grade.numAttempts > 0;
                        const satisfiesIdFilter = idFilter ? grade.courseWWTopicQuestionId === idFilter : true;
                        return hasAttempts && satisfiesIdFilter;
                    });
                    logger.debug('Stats tab: [useEffect] setting grade.');
                    setGrade(grades.first);
                    setTitleGrade(_.isNil(grades.first) ? null : {effectiveScore: grades.first?.effectiveScore, systemScore: grades.first?.partialCreditBestScore, bestScore: grades.first?.bestScore});
                    data = grades.map((grade: any) => (
                        grade.workbooks.map((attempt: any) => ({
                            id: attempt.id,
                            submitted: attempt.submitted,
                            result: attempt.result.toPercentString(),
                            time: attempt.time,
                            problemId: grade.courseWWTopicQuestionId
                        }))
                    ));
                    data = _.flatten(data);
                    data = data.sort((a: any, b: any) => moment(b.time).diff(moment(a.time)));
                } else {
                    logger.debug('Stats tab: [useEffect] setting gradesstate and grade');
                    setGradesState(defaultGradesState);
                    setGrade(null);
                    setTitleGrade(
                        {
                            totalAverage: data.totalAverage as number,
                            totalOpenAverage: data.totalOpenAverage as number,
                            totalDeadAverage: data.totalDeadAverage as number,
                        }
                    );

                    data = data.data.map((d: any) => ({
                        ...d,
                        averageAttemptedCount: formatNumberString(d.averageAttemptedCount),
                        averageScore: formatNumberString(d.averageScore, true),
                        ...(_.isNil(d.systemScore) ? undefined : {systemScore: formatNumberString(d.systemScore, true)}),
                        ...(_.isNil(d.openAverage) ? undefined : {openAverage: formatNumberString(d.openAverage, true)}),
                        ...(_.isNil(d.deadAverage) ? undefined : {deadAverage: formatNumberString(d.deadAverage, true)}),
                        completionPercent: formatNumberString(d.completionPercent, true)
                    }));
                }
                logger.debug('Stats tab: [useEffect] setting rowData');
                setRowData(data);
                setLoading(false);
            } catch (e) {
                logger.error('Failed to get statistics.', e);
                setStatisticsAlert({
                    message: `Failed to load statistics: ${e.message}`,
                    severity: 'error',
                });
                setLoading(false);
            }
        })();
    }, [course.id, globalView, idFilter, userId, userType]);

    const renderProblemPreview = (rowData: any) => {
        logger.debug('Stats tab: renderProblemPreview called');
        switch (view) {
        case StatisticsViewFilter.TOPICS_FILTERED:
        case StatisticsView.PROBLEMS:
            // Expand for problem
            return <ProblemIframe problem={new ProblemObject({ id: rowData.id })} setProblemStudentGrade={() => { }} readonly={true} />;
        case StatisticsViewFilter.PROBLEMS_FILTERED:
        case StatisticsView.ATTEMPTS:
            // Expand for attempt
            if (_.isNil(rowData.problemId)) {
                logger.error('rowData.problemId cannot be nil!');
            }
            return <ProblemIframe problem={new ProblemObject({ id: rowData.problemId })} setProblemStudentGrade={() => { }} workbookId={rowData.id} readonly={true} />;
        default:
            logger.error('Problem preview can only happen for problems or attempts');
            return <>An application error has occurred</>;
        }
    };

    const resetBreadCrumbs = (selectedKey: string, newBreadcrumb?: BreadCrumbFilter) => {
        logger.debug('Stats tab: resetting breadcrumbs');
        const globalSelectedKey: StatisticsView = statisticsViewFromAllStatisticsViewFilter(selectedKey as StatisticsViewAll);
        let key: StatisticsView = StatisticsView.UNITS;
        let lastFilter: number | null = null;
        const newBreadcrumbFilter: EnumDictionary<StatisticsView, BreadCrumbFilter> = {};
        // used to break the loop after one extra iteration (or 0 if it reaches the end)
        let breakLoop = false;
        for((key as string) in StatisticsView) {
            // now that key is the correct value (1 after the selected) break the loop
            if (breakLoop) {
                break;
            }
            newBreadcrumbFilter[key] = breadcrumbFilter[key];
            lastFilter = newBreadcrumbFilter[key]?.id || null;
            // I want key to increment once more, so using a boolean to break at the start of the next iteration
            if (key === globalSelectedKey) {
                breakLoop = true;
                if (!_.isNil(newBreadcrumb)) {
                    newBreadcrumbFilter[key] = newBreadcrumb;
                }
            }
        }
        logger.debug('Stats tab: setting Breadcrumb Filter');
        setBreadcrumbFilters(newBreadcrumbFilter);
        return {
            lastFilter,
            nextKey: key
        };
    };

    const nextView = (event: any, rowData: any, togglePanel: any) => {
        logger.debug('Stats tab: [nextView] proceeding to next view.');
        setLoading(true);
        const newBreadcrumb = {
            id: rowData.id,
            displayName: rowData.name
        };
        switch (view) {
        case StatisticsView.UNITS:
            logger.debug('Stats tab: [nextView] setting IdFilter and View - switching to topics');
            setIdFilter(rowData.id);
            resetBreadCrumbs(StatisticsView.UNITS, newBreadcrumb);
            setView(StatisticsViewFilter.UNITS_FILTERED);
            break;
        case StatisticsViewFilter.UNITS_FILTERED:
        case StatisticsView.TOPICS:
            logger.debug('Stats tab: [nextView] setting IdFilter and View - switching to problems');
            setIdFilter(rowData.id);
            resetBreadCrumbs(StatisticsView.TOPICS, newBreadcrumb);
            setView(StatisticsViewFilter.TOPICS_FILTERED);
            break;
        case StatisticsViewFilter.TOPICS_FILTERED:
        case StatisticsView.PROBLEMS:
            if (userId !== undefined) {
                logger.debug('Stats tab: [nextView] setting IdFilter and View -- switching to attempts');
                setIdFilter(rowData.id);
                resetBreadCrumbs(StatisticsView.PROBLEMS, newBreadcrumb);
                setView(StatisticsViewFilter.PROBLEMS_FILTERED);
            } else {
                logger.debug('Stats tab: no userId provided, showing a panel.');
                togglePanel();
                setLoading(false);
            }
            break;
        case StatisticsView.ATTEMPTS:
        case StatisticsViewFilter.PROBLEMS_FILTERED:
            logger.debug('Stats tab: toggle panel');
            togglePanel();
            setLoading(false);
            break;
        default:
            break;
        }
    };

    const onConfirm = async () => {
        try {
            if (_.isNil(grade) || _.isNil(grade.id)) {
                throw new Error('Application Error: Grade null');
            }
            setGradesState(defaultGradesState);
            const newLockedValue = !grade.locked;
            const result = await putQuestionGrade({
                id: grade.id,
                data: {
                    locked: newLockedValue
                }
            });

            if(!_.isNil(gradesState.rowData?.grades[0])) {
                gradesState.rowData.grades[0].locked = newLockedValue;
            }

            setGradesState(defaultGradesState);
            setGrade(result.data.data.updatesResult.updatedRecords[0] as StudentGrade);
        } catch (e) {
            setGradesState({
                ...gradesState,
                lockAlert: {
                    message: e.message,
                    variant: 'danger'
                }
            });
        }
    };

    const getColumnHeaders = () => {
        switch (view) {
        case StatisticsView.UNITS:
            return _.isNil(userId) ? STATISTICS_SIMPLIFIED_HEADERS : STUDENT_STATISTICS_SIMPLIFIED_HEADERS;
        case StatisticsViewFilter.UNITS_FILTERED:
        case StatisticsView.TOPICS:
            return _.isNil(userId) ? STATISTICS_SIMPLIFIED_HEADERS : STUDENT_STATISTICS_SIMPLIFIED_TOPIC_HEADERS;
        case StatisticsViewFilter.TOPICS_FILTERED:
        case StatisticsView.PROBLEMS:
            return _.isNil(userId) ? STATISTICS_SIMPLIFIED_HEADERS : STUDENT_STATISTICS_SIMPLIFIED_PROBLEM_HEADERS;
        case StatisticsViewFilter.PROBLEMS_FILTERED:
        case StatisticsView.ATTEMPTS:
            return STUDENT_STATISTICS_ATTEMPTS_HEADERS;
        default:
            logger.error('You should not have a view that is not the views or filtered views');
            return [];
        }
    };

    const hasDetailPanel = userId !== undefined ?
        (view === StatisticsView.ATTEMPTS || view === StatisticsViewFilter.PROBLEMS_FILTERED):
        (view === StatisticsView.PROBLEMS || view === StatisticsViewFilter.TOPICS_FILTERED);

    let actions: Array<any> | undefined = [];
    if(!hasDetailPanel) {
        actions.push({
            icon: function IconWrapper() {return <ChevronRight />; },
            tooltip: 'See More',
            onClick: _.curryRight(nextView)(() => { }),
        });
    }
    if (!_.isNil(userId) && view === StatisticsViewFilter.TOPICS_FILTERED) {
        logger.debug('Stats tab: [root] preparing table actions');
        if (userType === UserRole.PROFESSOR) {
            actions.push((rowData: any) => {
                // Don't show until the override information is available
                if(_.isNil(rowData.grades)) {
                    return;
                }
                return {
                    icon:  function IconWrapper() { return <BsPencilSquare />; },
                    tooltip: 'Override grade',
                    onClick: (_event: any, rowData: any) => {
                        logger.debug('Stats tab: [root] setting grade and gradesstate');
                        setGrade(rowData.grades[0]);
                        setGradesState({
                            ...gradesState,
                            view: GradesStateView.OVERRIDE,
                            rowData
                        });
                    }
                };
            });
        }

        actions.push((rowData: any) => {
            // Don't show until the lock information is available
            if(_.isNil(rowData.grades)) {
                return;
            }

            const { locked } = rowData.grades[0];

            // Students only see if their grade is "locked"
            const unlockedIcon = userType === UserRole.PROFESSOR ? <BsUnlock/> : null;
            const icon = locked ? <BsLock/> : unlockedIcon;

            // If we have decided not to render anything then return
            if(_.isNil(icon)) {
                return;
            }

            // Don't include the onclick event for non professors
            const onClick = userType === UserRole.PROFESSOR ?
                () => {
                    logger.debug('Stats tab: [rowData onClick] setting grade and gradesstate');
                    setGrade(rowData.grades[0]);
                    setGradesState({
                        ...gradesState,
                        view: GradesStateView.LOCK,
                        rowData
                    });
                }
                :
                null;

            return {
                icon: () => icon,
                tooltip: `Grade ${locked ? 'Locked' : 'Unlocked'}`,
                onClick
            };
        });
    }

    if(_.isEmpty(actions)) {
        actions = undefined;
    }

    return (
        <>
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    paddingTop:'20px',
                    paddingBottom:'20px',
                }}
            >
                <h2>
                    {(() => {
                        if (getUserRole() === UserRole.STUDENT) {
                            return 'Your grades';
                        } else {
                            if (_.isNil(userId)) {
                                return 'Statistics'; 
                            } else {
                                return 'Student\'s Grades';
                            }
                        }
                    })()}
                </h2>
            </div>
            <Nav fill variant='pills' activeKey={view} onSelect={(selectedKey: string | null) => {
                logger.debug('Stats tab: [nav1] setting IdFilter and view');
                if (_.isNil(selectedKey)) {
                    logger.error('The selectedKey for the Statistics Tab is null. (TSNH)');
                    return;
                }
                setView(selectedKey as StatisticsViewAll);
                setBreadcrumbFilters({});
                setIdFilter(null);
            }}>
                {Object.keys(StatisticsView).map((key: string) => (
                    (key !== StatisticsView.ATTEMPTS || userId !== undefined) &&
                    <Col key={`global-${key}`} className="p-0" >
                        <Nav.Item>
                            <Nav.Link eventKey={key} >
                                {_.capitalize(key)}
                            </Nav.Link>
                        </Nav.Item>
                    </Col>
                ))}
            </Nav>
            <Nav fill variant='pills' activeKey={view} onSelect={(selectedKey: string | null) => {
                if (_.isNil(selectedKey)) {
                    logger.error('The selectedKey for the Statistics Tab is null. (TSNH)');
                    return;
                }
                const { lastFilter } = resetBreadCrumbs(selectedKey);
                logger.info('Stats tab: [nav2] setting IdFilter and view');
                setView(selectedKey as StatisticsViewFilter);
                setIdFilter(lastFilter);
            }}>
                {Object.keys(StatisticsViewFilter).map((key: string) => {
                    const globalKey = statisticsViewFromAllStatisticsViewFilter(key as StatisticsViewFilter);
                    return (
                        (key !== StatisticsViewFilter.ATTEMPTS_FILTERED || userId !== undefined) &&
                        <Col key={`filtered-${key}`} className="p-0" >
                            <Nav.Item>
                                <Nav.Link eventKey={key} className={`${_.isNil(breadcrumbFilter[globalKey as StatisticsView]) ? 'invisible' : ''}`} >
                                    {breadcrumbFilter[globalKey]?.displayName}
                                </Nav.Link>
                            </Nav.Item>
                        </Col>
                    );
                })}
            </Nav>
            <div style={{ maxWidth: '100%' }}>
                {userType === UserRole.PROFESSOR && !_.isNil(userId) && !_.isNil(grade) &&
                <>
                    <OverrideGradeModal
                        show={gradesState.view === GradesStateView.OVERRIDE}
                        onHide={() => setGradesState(defaultGradesState)}
                        grade={grade}
                        onSuccess={(newGrade: Partial<StudentGrade>) => {
                            if(!_.isNil(gradesState.rowData?.grades[0]) && !_.isNil(newGrade.effectiveScore)) {
                                gradesState.rowData.averageScore = `${(newGrade.effectiveScore * 100).toFixed(1)}%`;
                                gradesState.rowData.grades[0] = newGrade;
                            }

                            setGrade(newGrade as StudentGrade);
                        }}
                    />

                    <ConfirmationModal
                        show={gradesState.view === GradesStateView.LOCK}
                        onHide={() => setGradesState(defaultGradesState)}
                        onConfirm={onConfirm}
                        confirmText='Confirm'
                        headerContent={<h6>{grade.locked ? 'Unlock' : 'Lock'} Grade</h6>}
                        bodyContent={(
                            <>
                                {gradesState.lockAlert && <Alert variant={gradesState.lockAlert.variant}>{gradesState.lockAlert.message}</Alert>}
                                <p>Are you sure you want to {grade.locked ? 'unlock' : 'lock'} this grade?</p>
                                {grade.locked && <p>Doing this might allow the student to get an updated score on this problem.</p>}
                                {!grade.locked && <p>The student will no longer be able to get updates to their score for this problem.</p>}
                            </>
                        )}
                    />
                </>}
                { loading && <CircularProgress />}
                { !loading && statisticsAlert.message !== '' && (
                    <MUIAlert
                        onClose={() => setStatisticsAlert(alertState => ({ ...alertState, message: '' }))}
                        severity={statisticsAlert.severity}
                        variant='filled'
                        style={{ fontSize: '1.1em' }}
                    >
                        {statisticsAlert.message}
                    </MUIAlert>
                )}
                {!loading && statisticsAlert.message === '' && rowData.length > 0 && (
                    <MaterialTable
                        key={rowData.length}
                        icons={MaterialIcons}
                        title={<TableTitleComponent
                            userType={userType}
                            view={view}
                            userId={userId}
                            grade={grade}
                            course={course}
                            breadcrumbFilter={breadcrumbFilter}
                            setGradesState={setGradesState}
                            gradesState={gradesState}
                            titleGrade={titleGrade}
                        />}
                        columns={getColumnHeaders()}
                        data={rowData}
                        actions={actions}
                        onRowClick={nextView}
                        options={{
                            exportButton: true,
                            exportAllData: true,
                            sorting: true,
                            emptyRowsWhenPaging: false,
                            pageSize: rowData.length ?? 0,
                            exportFileName: course.name
                        }}
                        detailPanel={hasDetailPanel ? [{
                            icon:  function IconWrapper() { return <ChevronRight />; },
                            render: renderProblemPreview
                        }] : undefined}
                        localization={{ header: { actions: '' } }}
                        components={{
                            Pagination: function PaginationWrapper(props) {
                                return <TablePagination
                                    {...props}
                                    rowsPerPageOptions={[..._.range(0, rowData.length, 5), { label: 'All', value: rowData.length }]}
                                />;
                            }
                        }}
                    />
                )}
            </div>
        </>
    );
};

const TableTitleComponent = (
    {userType, view, userId, grade, course, breadcrumbFilter, setGradesState, gradesState, titleGrade}: {
        userType: UserRole,
        view: StatisticsViewAll,
        userId?: number,
        grade: StudentGrade | null,
        course: CourseObject,
        breadcrumbFilter: EnumDictionary<StatisticsView, BreadCrumbFilter>,
        setGradesState: React.Dispatch<React.SetStateAction<GradesState>>,
        gradesState: GradesState,
        titleGrade: TitleData | null,
    }
) => (
    <Grid container spacing={1}>
        <Grid item>
            <h6
                style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}
                className="MuiTypography-root MuiTypography-h6"
            >
                {
                    Object.keys(StatisticsView).reduce((result: string, key: string) => {
                        return breadcrumbFilter[key as StatisticsView]?.displayName ?? result;
                    }, course.name)
                }
            </h6>
        </Grid>
        <Grid item>
            {/* Requiring userId here hides this on the Professor's Statistics page. This may be removed in the future. */}
            {userId && titleGrade &&
                <Tooltip title={('totalOpenAverage' in titleGrade) ?
                    <>
                        {titleGrade.totalAverage && <>{titleGrade.totalAverage.toPercentString()} Overall <br/></>}
                        {titleGrade.totalDeadAverage && <>{titleGrade.totalDeadAverage.toPercentString()} on Closed Topics</>}
                    </> :
                    <>
                        {titleGrade.bestScore.toPercentString()} on time <br/>
                        {titleGrade.systemScore.toPercentString()} overall
                    </>}
                >
                    <Chip
                        size='small'
                        color={'primary'}
                        label={ ('totalOpenAverage' in titleGrade) ?
                            titleGrade.totalOpenAverage?.toPercentString() :
                            titleGrade.effectiveScore?.toPercentString()
                        }
                    />
                </Tooltip>
            }
        </Grid>
        {
            (userType === UserRole.PROFESSOR) &&
            !_.isNil(userId) &&
            !_.isNil(grade) &&
            (view === StatisticsViewFilter.PROBLEMS_FILTERED) && (
                <Grid item>
                    <BSButton
                        className="ml-3 mr-1"
                        onClick={() => setGradesState({
                            ...gradesState,
                            view: GradesStateView.OVERRIDE
                        })}
                    >
                        <>
                            <BsPencilSquare/> Override
                        </>
                    </BSButton>

                    <BSButton
                        variant={grade.locked ? 'warning' : 'danger'}
                        className="ml-1 mr-1"
                        onClick={() => {
                            logger.info('Stats tab: [table BSButton] setting gradesstate');
                            setGradesState({
                                ...gradesState,
                                view: GradesStateView.LOCK
                            });
                        }}
                    >
                        {grade.locked ? <><BsLock/> Unlock</>: <><BsUnlock/> Lock</>}
                    </BSButton>
                </Grid>
            )}
    </Grid>
);

export default StatisticsTab;