import Cookies from 'js-cookie';
import React, { useState, useEffect } from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import { MomentReacter } from '../Components/MomentReacter';
import { CookieEnum } from '../Enums/CookieEnum';
import { unauthorizedRedirect, getUserRoleFromServer } from '../Enums/UserRole';
import logger from '../Utilities/Logger';
import _ from 'lodash';
import { Button, Modal } from 'react-bootstrap';
import moment from 'moment';
import { checkIn } from '../APIInterfaces/BackendAPI/Requests/UserRequests';
import { performLogout } from './NavWrapper';
import localPreferences from '../Utilities/LocalPreferences';
import AxiosRequest from '../Hooks/AxiosRequest';

interface AuthorizationWrapperProps {
    children: React.ReactNode
}

interface ParsedSessionCookie {
    uuid: string | undefined;
    expirationEpochTime: number | undefined;
}
const parseSessionCookie = (): ParsedSessionCookie => {
    const sessionCookie = Cookies.get(CookieEnum.SESSION);
    logger.debug('Authorization wrapper got session cookie: ', sessionCookie);
    if (_.isNil(sessionCookie)) {
        return {
            uuid: undefined,
            expirationEpochTime: undefined    
        };
    }
    const cookieTokens = sessionCookie.split('_');
    const [ uuid, expirationToken ] = cookieTokens;
    const expectedCookieTokensLength = 3;
    if (cookieTokens.length > expectedCookieTokensLength) {
        logger.warn(`sessionCookie broke into ${cookieTokens.length} pieces, expected less than ${expectedCookieTokensLength}`);
    }
    let expirationEpochTime = undefined;
    if(!_.isNil(expirationToken)) {
        expirationEpochTime = parseInt(expirationToken, 10);
        if (_.isNaN(expirationEpochTime)) {
            logger.warn('parseSessionCookie: second token was expected to be a number (expiration) but was not');
            expirationEpochTime = undefined;
        }
    }
    return {
        uuid: uuid,
        expirationEpochTime: expirationEpochTime
    };
};

export const AuthorizationWrapper: React.FC<AuthorizationWrapperProps> = ({
    children
}) => {
    const history = useHistory();

    // default to max date
    const [tokenExpiration, setTokenExpiration] = useState<Date>(new Date(8640000000000000));
    const { session } = localPreferences;
    // The expiration date cannot be fetched from the cookie
    // Can't rely on it from login either because it updates
    // Could set a second cookie or embed it in the original cookie
    // const authExpirationDate = useState(() => {
    //     const sessionCookie = Cookies.get(CookieEnum.SESSION);
    //     return sessionCookie.expirationDate
    // });

    useEffect(()=>{
        const parsedSessionCookie = parseSessionCookie();

        if (!_.isNil(parsedSessionCookie.uuid) && _.isNil(session.userId)) {
            (async () => {
                const resp = await AxiosRequest.get('/users/session');
                session.userId = resp.data.data.userId;
                session.userType = getUserRoleFromServer(resp.data.data.roleId);
                session.actualUserType = session.userType;
                session.userUUID = resp.data.data.uuid;
                session.username = `${resp.data.data.firstName} ${resp.data.data.lastName}`;
                // gaTrackLogin('EMAIL', session.userId);
            })();
        }
    }, [session]);

    const renewSession = async () => {
        try {
            await checkIn();
            const parsedSessionCookie = parseSessionCookie();
            if (!_.isNil(parsedSessionCookie.expirationEpochTime)) {
                setTokenExpiration(new Date(parsedSessionCookie.expirationEpochTime));
            }
        } catch(e) {
            logger.error('Could not check in', e);
        }
    };

    const logoutClick = () => {
        performLogout(history);
    };

    const reactionTime = tokenExpiration.toMoment().add(1, 'second'); // Give the browser a buffer to clear the cookie
    const catchTime1 = tokenExpiration.toMoment().add(5, 'second'); // Second check for browser cleared cookie, eventually cookies will be event driven
    const catchTime2 = tokenExpiration.toMoment().add(10, 'second'); // Third check for browser cleared cookie, eventually cookies will be event driven
    const warningTime = tokenExpiration.toMoment().subtract(5, 'minute');
    // TODO Add reactivity from cookies, use cookie hook is only reactive from changes within the application (not the cookie expiring or the user deleting the cookie)
    // There is an on change event that is not supported by safari: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies/onChanged
    // The benefit of total reactivity is that we could detect if the browser deletes the cookie
    // The use cookie hook might be enough if we wrap all of our api calls and on unauthorized remove the cookie
    return <MomentReacter stopMoment={catchTime2} significantMoments={[warningTime, reactionTime, catchTime1, catchTime2]} logTag={'auth check'}>
        {() => {
            const parsedSessionCookie = parseSessionCookie();
            if(!parsedSessionCookie.uuid) {
                unauthorizedRedirect(false);
                return <Redirect to={{
                    pathname: '/'
                }} />;
            }

            const expirationEpochTime = parsedSessionCookie.expirationEpochTime;
            if (!_.isNil(expirationEpochTime)) {
                if (expirationEpochTime !== tokenExpiration.getTime()) {
                    /* Using set timeout gets rid of the error:
                    * Cannot update a component (`AuthorizationWrapper`) while rendering a different component (`MomentReacter`).
                    * This error is due to `setTokenExpiration` (a dispatch from the parent) being called from the child (causing the parent to rerender)
                    * By using setTimeout we defer the setState until the call stack has completed
                    * I found several suggestions to use "useEffect" https://stackoverflow.com/a/63424831 however we cannot here since this is a component whose child is a function
                    * I also feel like useEffect is solving the problem in the same way
                    */
                    setTimeout(() => {
                        setTokenExpiration(tokenExpiration => tokenExpiration.getTime() === expirationEpochTime ? tokenExpiration : new Date(expirationEpochTime));
                    });
                }
            }
            return <>
                <Modal
                    show={moment().isSameOrAfter(warningTime)}
                    onHide={()=>{}}
                >
                    <Modal.Header>
                        <h5>Inactivity warning</h5>
                    </Modal.Header>
                    <Modal.Body>
                        Your session will end due to inactivity <MomentReacter logTag="auth countdown" intervalInMillis={1000}>{() => <>{tokenExpiration.toMoment().formattedFromNow(false, 'm [minutes] [and] s [seconds]')}</>}</MomentReacter>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={logoutClick}>Log out</Button>
                        <Button variant="primary" onClick={renewSession}>Continue</Button>
                    </Modal.Footer>
                </Modal>
                {children}
            </>;
        }}
    </MomentReacter>;
};
