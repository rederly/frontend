import React from 'react'
import { BrowserRouter, Switch, Route, Link } from "react-router-dom"
import Login from "./Login/login"
import HomePage from './Home/HomePage';

interface RouterProps {

}

export const Router: React.FC<RouterProps> = ({}) => {
        return (
            <BrowserRouter>
                <Switch>
                    <Route exact path="/">
                        <HomePage/>
                    </Route>
                    <Route path="/login">
                        <Login/>
                    </Route>
                    <Route path="/user">
                        <User/>
                    </Route>
                    <Route path="/">
                        <NoPage/>
                    </Route>
                </Switch>
            </BrowserRouter>
        );
}

function User() {
    return <h2>User</h2>;
}

function NoPage() {
    return (
        <>
            <h1>404 Error</h1>
            <h2>Page not found</h2>
        </>
    );
}