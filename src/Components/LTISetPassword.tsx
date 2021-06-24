import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import SimpleFormRow from '../Components/SimpleFormRow';
import useAlertState from '../Hooks/useAlertState';
import { putUpdateNilPassword } from '../APIInterfaces/BackendAPI/Requests/UserRequests';
import { Grid } from '@material-ui/core';
import logger from '../Utilities/Logger';

interface LTISetPasswordProps {
    onDone: ()=>void;
    ltik: string;
}

type UpdatePasswordFormData = {
    passwordCurrent: string;
    password: string;
    passwordConf: string;
}

// TODO: Use Axios.Request JSX to selectively render success or failure.
export const LTISetPassword: React.FC<LTISetPasswordProps> = ({onDone, ltik}) => {
    const [formState, setFormState] = useState<UpdatePasswordFormData>({
        passwordCurrent: '',
        password: '',
        passwordConf: '',
    });
    const [validated, setValidated] = useState(false);
    const [{ message: updatePasswordAlertMsg, variant: updatePasswordAlertType }, setUpdatePasswordAlert] = useAlertState();

    const handleUpdatePassword = async () => {
        try {
            await putUpdateNilPassword({
                newPassword: formState.password,
                ltik,
            });
            setUpdatePasswordAlert({
                message: 'Password updated successfully',
                variant: 'success'
            });
            onDone();
        } catch (e) {
            setUpdatePasswordAlert({
                message: e.message,
                variant: 'danger'
            });
        }
    };

    const handleSubmit = (event: any) => {
        const form = event.currentTarget;
        event.preventDefault();

        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            if (formState.password !== formState.passwordConf) {
                setUpdatePasswordAlert({
                    message: 'Your password did not match the confirmation.',
                    variant: 'danger'
                });
            } else {
                handleUpdatePassword();
            }
        }

        setValidated(true);
    };

    const handleNamedChange = (name: keyof UpdatePasswordFormData) => {
        return (event: any) => {
            if (name !== event.target.name) {
                logger.error(`Mismatched event, ${name} is on ${event.target.name}`);
            }
            const val = event.target.value;
            setFormState({
                ...formState,
                [name]: val
            });
            // remove any errors
            setUpdatePasswordAlert({
                message: '',
                variant: 'info'
            });    
        };
    };

    return (
        <Grid container item spacing={3} xs={6} justify='center'>
            <Form noValidate validated={validated} onSubmit={handleSubmit} action='#'>
                {(updatePasswordAlertMsg !== '') && <Alert variant={updatePasswordAlertType}>{updatePasswordAlertMsg}</Alert>}
                <SimpleFormRow
                    id="password"
                    label="New Password"
                    errmsg="Your password must be at least 4 characters long."
                    required
                    defaultValue=''
                    name="password"
                    autoComplete="new-password"
                    type="password"
                    onChange={handleNamedChange('password')}
                    placeholder="******"
                    // TODO: Minimum password requirements
                    minLength={4}
                    maxLength={26}
                />
                <SimpleFormRow
                    id="password"
                    label="Confirm New Password"
                    errmsg="Your password must be at least 4 characters long."
                    required
                    defaultValue=''
                    name="passwordConf"
                    autoComplete="new-password"
                    type="password"
                    onChange={handleNamedChange('passwordConf')}
                    placeholder="******"
                    // TODO: Minimum password requirements
                    minLength={4}
                    maxLength={26}
                />
                <Form.Group>
                    <Button type="submit">Submit</Button>
                </Form.Group>
            </Form>
        </Grid>
    );
};

export default LTISetPassword;